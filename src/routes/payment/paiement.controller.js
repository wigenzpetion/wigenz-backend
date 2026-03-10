const PaymentService = require("./payment.service");

class PaymentController {

  static async create(req, res, next) {
    try {
      const payment = await PaymentService.createPayment(
        req.body,
        req.user
      );
      res.status(201).json(payment);
    } catch (err) {
      next(err);
    }
  }

  static async getById(req, res, next) {
    try {
      const payment = await PaymentService.getPaymentById(
        req.params.id,
        req.user
      );
      res.json(payment);
    } catch (err) {
      next(err);
    }
  }

  static async getMine(req, res, next) {
    try {
      const payments = await PaymentService.getMyPayments(req.user);
      res.json(payments);
    } catch (err) {
      next(err);
    }
  }

  static async getAll(req, res, next) {
    try {
      const payments = await PaymentService.getAllPayments(
        req.query,
        req.user
      );
      res.json(payments);
    } catch (err) {
      next(err);
    }
  }

  static async updateStatus(req, res, next) {
    try {
      const payment = await PaymentService.updatePaymentStatus(
        req.params.id,
        req.body.status,
        req.user
      );
      res.json(payment);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = PaymentController;