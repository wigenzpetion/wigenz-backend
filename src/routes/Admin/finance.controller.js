const PaymentRepository = require("../payment/payment.repository");
const PayoutRepository = require("../payout/payout.repository");
const db = require("../../config/db");

class FinanceController {
  static async overview(req, res, next) {
    try {
      const payments = await PaymentRepository.findAll({});
      const payouts = await PayoutRepository.findAll({});

      const totalRevenue = payments
        .filter((p) => p.status === "COMPLETED")
        .reduce((sum, p) => sum + Number(p.amount), 0);

      const totalPayouts = payouts
        .filter((p) => p.status === "PAID")
        .reduce((sum, p) => sum + Number(p.amount), 0);

      res.json({ totalRevenue, totalPayouts, net: totalRevenue - totalPayouts });
    } catch (err) {
      next(err);
    }
  }

  static async allPayments(req, res, next) {
    try {
      const payments = await PaymentRepository.findAll(req.query);
      res.json(payments);
    } catch (err) {
      next(err);
    }
  }

  static async allPayouts(req, res, next) {
    try {
      const payouts = await PayoutRepository.findAll(req.query);
      res.json(payouts);
    } catch (err) {
      next(err);
    }
  }

  static async processPayouts(req, res, next) {
    try {
      const PaymentService = require("../payment/payment.service");
      await PaymentService.processDriverPayouts();
      res.json({ message: "Payout processing triggered successfully" });
    } catch (error) {
      next(error);
    }
  }

  static async refundPayment(req, res, next) {
    try {
      const RefundService = require("../payment/refund.service");
      const result = await RefundService.refundPayment(req.params.paymentId, req.user);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  static async pendingPayouts(req, res, next) {
    try {
      const result = await db.query(
        `SELECT * FROM driver_payout_queue
         WHERE status = 'PENDING'
         ORDER BY delivered_at ASC`
      );
      res.json(result.rows);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = FinanceController;
