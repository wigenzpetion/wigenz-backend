const db = require("../../config/db");
const RefundService = require("../payment/refund.service");
const logger = require("../../utils/log-system");

class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
  }
}

class CancelDeliveryService {

  /**
   * Cancel a delivery order
   */
  static async cancel(orderId, currentUser) {

    // 1️⃣ Get order
    const orderResult = await db.query(
      `SELECT * FROM orders WHERE id = $1`,
      [orderId]
    );

    const order = orderResult.rows[0];

    if (!order) {
      throw new AppError("Order not found", 404);
    }

    // 2️⃣ RBAC
    // Client can cancel own order
    if (
      currentUser.role === "CLIENT" &&
      order.user_id !== currentUser.id
    ) {
      throw new AppError("Unauthorized", 403);
    }

    // Admin can cancel any order
    if (
      currentUser.role !== "CLIENT" &&
      currentUser.role !== "ADMIN" &&
      currentUser.role !== "SUPER_ADMIN"
    ) {
      throw new AppError("Unauthorized", 403);
    }

    // 3️⃣ Check if already cancelled
    if (order.status === "CANCELLED") {
      throw new AppError("Order already cancelled", 400);
    }

    // 4️⃣ Update order status
    await db.query(
      `UPDATE orders
       SET status = 'CANCELLED',
           updated_at = NOW()
       WHERE id = $1`,
      [orderId]
    );

    logger.info("Order cancelled", {
      orderId,
      cancelledBy: currentUser.id
    });

    // 5️⃣ If payment exists → refund automatically
    const paymentResult = await db.query(
      `SELECT * FROM payments
       WHERE order_id = $1
       AND status = 'COMPLETED'`,
      [orderId]
    );

    const payment = paymentResult.rows[0];

    if (payment) {
      const role = String(currentUser.role || "").toUpperCase();
      const isAdmin = role === "ADMIN" || role === "SUPER_ADMIN";

      if (isAdmin) {
        await RefundService.refundPayment(payment.id, currentUser);

        return {
          message: "Order cancelled and refunded",
          orderId
        };
      }

      return {
        message: "Order cancelled successfully. Refund pending review",
        orderId
      };
    }

    return {
      message: "Order cancelled successfully",
      orderId
    };
  }
}

module.exports = CancelDeliveryService;
