const db = require("../../config/db");
const logger = require("../../utils/log-system");

class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
  }
}

/**
 * DRIVER SUBSCRIPTION SERVICE
 *
 * BUSINESS RULES:
 *
 * 1️⃣ Driver can subscribe anytime.
 * 2️⃣ If subscription expires:
 *      → Driver can still work
 *      → Earnings go to held_balance
 *      → No payout allowed
 * 3️⃣ When driver subscribes again:
 *      → held_balance moves to available_balance
 *      → Subscription extended 1 month
 * 4️⃣ Driver can cancel auto-renew anytime.
 */

class DriverSubscriptionService {

  /**
   * Subscribe or Renew subscription
   */
  static async subscribe(driverId) {

    const driverResult = await db.query(
      `SELECT * FROM drivers WHERE id = $1`,
      [driverId]
    );

    const driver = driverResult.rows[0];

    if (!driver) {
      throw new AppError("Driver not found", 404);
    }

    let newEndDateQuery;

    // If subscription still active → extend from existing end date
    if (
      driver.subscription_status === "ACTIVE" &&
      driver.subscription_end_date &&
      new Date(driver.subscription_end_date) > new Date()
    ) {
      newEndDateQuery = `
        subscription_end_date + INTERVAL '1 month'
      `;
    } else {
      // Start new subscription from now
      newEndDateQuery = `
        NOW() + INTERVAL '1 month'
      `;
    }

    const updateQuery = `
      UPDATE drivers
      SET subscription_status = 'ACTIVE',
          subscription_end_date = ${newEndDateQuery},
          auto_renew = true,
          available_balance = available_balance + held_balance,
          held_balance = 0,
          updated_at = NOW()
      WHERE id = $1
      RETURNING *;
    `;

    const result = await db.query(updateQuery, [driverId]);

    logger.info("Driver subscription activated/renewed", {
      driverId
    });

    return result.rows[0];
  }

  /**
   * Cancel auto-renew
   * Driver keeps access until subscription_end_date
   */
  static async cancel(driverId) {

    const result = await db.query(
      `
      UPDATE drivers
      SET subscription_status = 'CANCELLED',
          auto_renew = false,
          updated_at = NOW()
      WHERE id = $1
      RETURNING *;
      `,
      [driverId]
    );

    if (!result.rows[0]) {
      throw new AppError("Driver not found", 404);
    }

    logger.warn("Driver cancelled subscription (auto-renew disabled)", {
      driverId
    });

    return result.rows[0];
  }

  /**
   * Get subscription status
   */
  static async getStatus(driverId) {

    const result = await db.query(
      `
      SELECT 
        subscription_status,
        subscription_end_date,
        auto_renew,
        available_balance,
        held_balance
      FROM drivers
      WHERE id = $1
      `,
      [driverId]
    );

    if (!result.rows[0]) {
      throw new AppError("Driver not found", 404);
    }

    return result.rows[0];
  }

  /**
   * INTERNAL:
   * Mark expired subscriptions as INACTIVE
   * (Driver remains ACTIVE but earnings go to held_balance)
   */
  static async markExpiredSubscriptions() {

    const result = await db.query(`
      UPDATE drivers
      SET subscription_status = 'INACTIVE',
          updated_at = NOW()
      WHERE subscription_status IN ('ACTIVE','CANCELLED')
      AND subscription_end_date < NOW()
      RETURNING id;
    `);

    if (result.rows.length > 0) {
      logger.warn("Drivers marked INACTIVE due to subscription expiration", {
        count: result.rows.length
      });
    }

    return result.rows.length;
  }
}

module.exports = DriverSubscriptionService;