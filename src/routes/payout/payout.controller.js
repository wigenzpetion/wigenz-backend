const PayoutService = require("./payout.service");
const PaymentService = require("../payment/payment.service");

class PayoutController {

  // ==============================
  // DRIVER REQUEST PAYOUT
  // ==============================
  static async request(req, res, next) {
    try {

      const payout = await PayoutService.requestPayout(
        req.body,
        req.user
      );

      res.status(201).json(payout);

    } catch (err) {
      next(err);
    }
  }

  // ==============================
  // DRIVER GET HIS PAYOUTS
  // ==============================
  static async getMine(req, res, next) {
    try {

      const payouts = await PayoutService.getMyPayouts(req.user);

      res.json(payouts);

    } catch (err) {
      next(err);
    }
  }

  // ==============================
  // ADMIN LIST PAYOUTS
  // ==============================
  static async getAll(req, res, next) {
    try {

      const payouts = await PayoutService.getAllPayouts(
        req.query,
        req.user
      );

      res.json(payouts);

    } catch (err) {
      next(err);
    }
  }

  // ==============================
  // ADMIN UPDATE STATUS
  // ==============================
  static async updateStatus(req, res, next) {
    try {

      const payout = await PayoutService.updateStatus(
        req.params.id,
        req.body.status,
        req.user
      );

      res.json(payout);

    } catch (err) {
      next(err);
    }
  }

  // ==============================
  // ADMIN FORCE PAYOUT PROCESS
  // ==============================
  static async forcePayout(req, res, next) {
    try {

      await PaymentService.processDriverPayouts();

      res.json({
        message: "Payout processing triggered"
      });

    } catch (error) {
      next(error);
    }
  }

  // ==============================
  // NEW SYSTEM : PROCESS PAYOUTS
  // ==============================
  static async process(req, res, next) {
    try {

      await PayoutService.process();

      res.json({
        message: "Payouts processed successfully"
      });

    } catch (error) {
      next(error);
    }
  }

}

module.exports = PayoutController;
