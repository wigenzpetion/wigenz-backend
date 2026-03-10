const db = require("../../config/db");

class FraudScoreService {

  static async updateDriverScore(driverId) {

    let score = 0;

    const refunds = await db.query(
      `SELECT COUNT(*) FROM payments
       WHERE driver_id = $1
       AND status = 'REFUNDED'
       AND created_at > NOW() - INTERVAL '7 days'`,
      [driverId]
    );

    if (parseInt(refunds.rows[0].count) >= 3) score += 30;

    const invalidGPS = await db.query(
      `SELECT COUNT(*) FROM delivery_proofs
       WHERE driver_id = $1
       AND gps_valid = false
       AND created_at > NOW() - INTERVAL '7 days'`,
      [driverId]
    );

    if (parseInt(invalidGPS.rows[0].count) >= 2) score += 20;

    const fastDeliveries = await db.query(
      `SELECT COUNT(*) FROM orders
       WHERE driver_id = $1
       AND status = 'DELIVERED'
       AND delivered_at - picked_up_at < INTERVAL '3 minutes'
       AND created_at > NOW() - INTERVAL '7 days'`,
      [driverId]
    );

    if (parseInt(fastDeliveries.rows[0].count) >= 5) score += 25;

    if (score >= 70) {
      await db.query(
        `UPDATE drivers
         SET status = 'UNDER_REVIEW'
         WHERE id = $1`,
        [driverId]
      );
    }

    return score;
  }
}

module.exports = FraudScoreService;