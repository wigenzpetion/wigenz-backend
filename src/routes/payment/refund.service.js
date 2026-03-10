const db = require("../../config/db");
const InvoiceService = require("../invoice/invoice.service");
const FraudScoreService = require("../fraud/fraudScore.service");
const { ensureTeamAccess } = require("../../rbac/team-access.service");

class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
  }
}

class RefundService {
  static async refundPayment(paymentId, currentUser) {
    const role = String(currentUser?.role || "").toUpperCase();
    if (role !== "ADMIN" && role !== "SUPER_ADMIN" && role !== "FINANCE_ADMIN") {
      throw new AppError("Unauthorized", 403);
    }

    await ensureTeamAccess(currentUser, {
      teamCode: "FINANCE",
      enforcedRoles: ["FINANCE_ADMIN"],
      privilegedRoles: ["SUPER_ADMIN", "ADMIN"]
    });

    if (!paymentId) {
      throw new AppError("Payment ID is required", 400);
    }

    const client = await db.pool.connect();
    let payment;
    let order;

    try {
      await client.query("BEGIN");

      const paymentResult = await client.query(
        `SELECT * FROM payments
         WHERE id = $1
         FOR UPDATE`,
        [paymentId]
      );

      payment = paymentResult.rows[0];

      if (!payment) {
        throw new AppError("Payment not found", 404);
      }

      if (payment.status === "REFUNDED") {
        throw new AppError("Payment already refunded", 400);
      }

      if (payment.status !== "COMPLETED") {
        throw new AppError("Only completed payments can be refunded", 400);
      }

      const orderResult = await client.query(
        `SELECT * FROM orders
         WHERE id = $1
         FOR UPDATE`,
        [payment.order_id]
      );

      order = orderResult.rows[0];
      if (!order) {
        throw new AppError("Order not found", 404);
      }

      await client.query(
        `UPDATE payments
         SET status = 'REFUNDED',
             updated_at = NOW()
         WHERE id = $1`,
        [paymentId]
      );

      if (order.status !== "CANCELLED") {
        await client.query(
          `UPDATE orders
           SET status = 'CANCELLED',
               updated_at = NOW()
           WHERE id = $1`,
          [order.id]
        );
      }

      const payoutResult = await client.query(
        `SELECT * FROM driver_payout_queue
         WHERE order_id = $1
         FOR UPDATE`,
        [order.id]
      );

      const payout = payoutResult.rows[0];

      if (payout) {
        if (payout.status === "PAID") {
          const walletResult = await client.query(
            `UPDATE wallets
             SET available_balance = available_balance - $1,
                 updated_at = NOW()
             WHERE user_id = $2
               AND available_balance >= $1
             RETURNING *`,
            [payout.amount, order.driver_id]
          );

          if (!walletResult.rows[0]) {
            throw new AppError("Driver wallet balance is insufficient for refund reversal", 409);
          }
        }

        await client.query(
          `DELETE FROM driver_payout_queue
           WHERE order_id = $1`,
          [order.id]
        );
      }

      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }

    // Post-commit side effects (best-effort).
    try {
      await InvoiceService.generateInvoice({
        userId: payment.user_id,
        relatedId: payment.id,
        type: "REFUND",
        description: "Refund Issued - Delivery",
        amount: payment.amount,
        currency: payment.currency
      });
    } catch (error) {
      console.warn("Refund invoice generation failed:", error.message);
    }

    try {
      await FraudScoreService.updateDriverScore(order.driver_id);
    } catch (error) {
      console.warn("Driver fraud score update after refund failed:", error.message);
    }

    return {
      message: "Refund successful",
      refundedAmount: payment.amount
    };
  }
}

module.exports = RefundService;
