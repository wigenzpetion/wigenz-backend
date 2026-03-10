const PaymentRepository = require("../payment/payment.repository");
const DriverRepository = require("../drivers/driver.repository");
const db = require("../../config/db");

class RiskController {
  static async flaggedPayments(req, res, next) {
    try {
      const payments = await PaymentRepository.findAll({});
      const suspicious = payments.filter((p) => Number(p.amount) > 10000);
      res.json(suspicious);
    } catch (err) {
      next(err);
    }
  }

  static async suspendedDrivers(req, res, next) {
    try {
      const drivers = await DriverRepository.findAll({});
      const suspended = drivers.filter((d) => d.status === "SUSPENDED");
      res.json(suspended);
    } catch (err) {
      next(err);
    }
  }

  static async highRiskDrivers(req, res, next) {
    try {
      const result = await db.query(
        `SELECT id, fraud_score, status
         FROM drivers
         WHERE fraud_score >= 50
         ORDER BY fraud_score DESC`
      );
      res.json(result.rows);
    } catch (error) {
      next(error);
    }
  }

  static async resetFraudScore(req, res, next) {
    try {
      await db.query(
        `UPDATE drivers
         SET fraud_score = 0
         WHERE id = $1`,
        [req.params.driverId || req.params.id]
      );
      res.json({ message: "Fraud score reset" });
    } catch (error) {
      next(error);
    }
  }

  static async suspiciousOrders(req, res, next) {
    try {
      const result = await db.query(
        `SELECT * FROM orders
         WHERE status = 'DELIVERY_PENDING_VERIFICATION'
         ORDER BY updated_at DESC`
      );
      res.json(result.rows);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = RiskController;
