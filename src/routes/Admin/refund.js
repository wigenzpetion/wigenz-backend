const db = require("../../config/db");
const InvoiceService = require("../invoice/invoice.service");
const logger = require("../../utils/log-system");

class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
  }
}

class RefundService {

  /**
   * Refund a completed payment
   */
  static async refundPayment(paymentId, currentUser) {

    // 🔐 RBAC
    if (
      currentUser.role !== "ADMIN" &&
      currentUser.role !== "SUPER_ADMIN"
    ) {
      throw new AppError("Unauthorized action", 403);
    }

    // 1️⃣ Get payment
    const paymentResult = await db.query(
      `SELECT * FROM payments WHERE id = $1`,
      [paymentId]
    );

    const payment = paymentResult.rows[0];

    if (!payment) {
      throw new AppError("Payment not found", 404);
    }

    if (payment.status !== "COMPLETED") {
      throw new AppError("Only completed payments can be refunded", 400);
    }

    // 2️⃣ Update payment status
    await db.query(
      `UPDATE payments
       SET status = 'REFUNDED',
           updated_at = NOW()
       WHERE id = $1`,
      [paymentId]
    );

    // 3️⃣ Get user email
    const userResult = await db.query(
      `SELECT email FROM users WHERE id = $1`,
      [payment.user_id]
    );

    const user = userResult.rows[0];

    // 4️⃣ Generate Credit Note PDF + Send Email
    await InvoiceService.generateInvoice({
      userId: payment.user_id,
      relatedId: payment.id,
      type: "REFUND",
      description: "Refund Issued - Delivery",
      amount: payment.amount,
      currency: payment.currency,
      userEmail: user.email
    });

    logger.warn("Payment refunded", {
      adminId: currentUser.id,
      paymentId,
      amount: payment.amount
    });

    return {
      message: "Refund successful",
      paymentId,
      refundedAmount: payment.amount
    };
  }
}

module.exports = RefundService;