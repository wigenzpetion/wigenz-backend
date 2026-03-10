const db = require("../../config/db");
const logger = require("../../utils/log-system");

/**
 * Auto Subscription System
 *
 * IMPORTANT BUSINESS LOGIC:
 *
 * - We DO NOT suspend drivers after 14 days inactivity anymore.
 * - If subscription expires:
 *      → Driver can continue working
 *      → Earnings go to held_balance
 *      → No payout allowed
 * - Once driver pays subscription:
 *      → held_balance moves to available_balance
 */

class AutoSubscriptionSystem {

  static async execute() {

    /**
     * 1️⃣ Mark expired subscriptions as INACTIVE
     * (Driver still ACTIVE, only subscription affected)
     */
    const query = `
      UPDATE drivers
      SET subscription_status = 'INACTIVE',
          updated_at = NOW()
      WHERE subscription_status IN ('ACTIVE','CANCELLED')
      AND subscription_end_date < NOW()
      RETURNING id;
    `;

    const result = await db.query(query);

    if (result.rows.length > 0) {
      logger.warn("Drivers subscription expired - earnings will be held", {
        count: result.rows.length
      });
    }

    return {
      expiredSubscriptions: result.rows.length
    };
  }
}

module.exports = AutoSubscriptionSystem;