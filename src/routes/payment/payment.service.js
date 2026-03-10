const PaymentRepository = require("./payment.repository");
const InvoiceService = require("../invoice/invoice.service");
const db = require("../../config/db");
const { ensureTeamAccess } = require("../../rbac/team-access.service");

class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
  }
}

class PaymentService {
  /**
   * CLIENT cree paiement
   */
  static async createPayment(data, currentUser) {
    if (currentUser.role !== "CLIENT") {
      throw new AppError("Only client can create payment", 403);
    }

    const idempotencyKey = String(data?.idempotency_key || "").trim() || null;
    if (idempotencyKey) {
      const existing = await PaymentRepository.findByUserAndIdempotency(
        currentUser.id,
        idempotencyKey
      );
      if (existing) {
        return existing;
      }
    }

    data.user_id = currentUser.id;
    if (idempotencyKey) {
      data.idempotency_key = idempotencyKey;
    }

    const payment = await PaymentRepository.create(data);

    await InvoiceService.generateInvoice({
      userId: payment.user_id,
      relatedId: payment.id,
      type: "DELIVERY_PAYMENT",
      description: "Delivery Payment",
      amount: payment.amount,
      currency: payment.currency
    });

    return payment;
  }

  static async getPaymentById(id, currentUser) {
    const payment = await PaymentRepository.findById(id);

    if (!payment) {
      throw new AppError("Payment not found", 404);
    }

    if (currentUser.role === "CLIENT" && payment.user_id !== currentUser.id) {
      throw new AppError("Unauthorized", 403);
    }

    return payment;
  }

  static async getMyPayments(currentUser) {
    return PaymentRepository.findByUser(currentUser.id);
  }

  static async getAllPayments(pagination, currentUser) {
    const role = String(currentUser?.role || "").toUpperCase();
    if (role !== "ADMIN" && role !== "SUPER_ADMIN" && role !== "FINANCE_ADMIN") {
      throw new AppError("Unauthorized", 403);
    }

    await ensureTeamAccess(currentUser, {
      teamCode: "FINANCE",
      enforcedRoles: ["FINANCE_ADMIN"],
      privilegedRoles: ["SUPER_ADMIN", "ADMIN"]
    });

    return PaymentRepository.findAll(pagination);
  }

  static async updatePaymentStatus(id, status, currentUser) {
    const role = String(currentUser?.role || "").toUpperCase();
    if (role !== "ADMIN" && role !== "SUPER_ADMIN" && role !== "FINANCE_ADMIN") {
      throw new AppError("Unauthorized", 403);
    }

    await ensureTeamAccess(currentUser, {
      teamCode: "FINANCE",
      enforcedRoles: ["FINANCE_ADMIN"],
      privilegedRoles: ["SUPER_ADMIN", "ADMIN"]
    });

    return PaymentRepository.updateStatus(id, status);
  }

  /**
   * PLANIFICATION PAIEMENT CHAUFFEUR
   */
  static async scheduleDriverPayout(order) {
    if (!order || !order.id || !order.driver_id) {
      throw new AppError("Invalid order for payout scheduling", 400);
    }

    const payoutAmount = Number(order.driver_amount);
    if (!Number.isFinite(payoutAmount) || payoutAmount <= 0) {
      throw new AppError("Invalid driver payout amount", 400);
    }

    await db.query(
      `INSERT INTO driver_payout_queue
       (driver_id, order_id, amount, delivered_at, status)
       VALUES ($1,$2,$3,NOW(),'PENDING')
       ON CONFLICT (order_id) DO NOTHING`,
      [order.driver_id, order.id, payoutAmount]
    );
  }

  /**
   * CRON JOB paiement chauffeur
   */
  static async processDriverPayouts() {
    const payouts = await db.query(
      `SELECT *
       FROM driver_payout_queue
       WHERE status='PENDING'
       AND delivered_at <= NOW() - INTERVAL '10 hours'`
    );

    for (const payout of payouts.rows) {
      try {
        await this.executeDriverPayout(payout);
      } catch (error) {
        console.error(`Payout processing failed for queue id ${payout.id}:`, error.message);
      }
    }
  }

  /**
   * execution paiement chauffeur
   */
  static async executeDriverPayout(payout) {
    if (!payout || !payout.id) {
      throw new AppError("Invalid payout payload", 400);
    }

    const client = await db.pool.connect();

    try {
      await client.query("BEGIN");

      const queueResult = await client.query(
        `SELECT *
         FROM driver_payout_queue
         WHERE id = $1
         FOR UPDATE`,
        [payout.id]
      );

      const lockedPayout = queueResult.rows[0];
      if (!lockedPayout) {
        throw new AppError("Payout queue row not found", 404);
      }

      if (lockedPayout.status !== "PENDING") {
        await client.query("ROLLBACK");
        return;
      }

      const walletResult = await client.query(
        `UPDATE wallets
         SET available_balance = available_balance + $1,
             updated_at = NOW()
         WHERE user_id = $2
         RETURNING *`,
        [lockedPayout.amount, lockedPayout.driver_id]
      );

      if (!walletResult.rows[0]) {
        throw new AppError("Wallet not found for driver", 404);
      }

      const paidResult = await client.query(
        `UPDATE driver_payout_queue
         SET status='PAID',
             updated_at = NOW()
         WHERE id=$1
           AND status='PENDING'
         RETURNING *`,
        [lockedPayout.id]
      );

      if (!paidResult.rows[0]) {
        throw new AppError("Payout already processed", 409);
      }

      await client.query("COMMIT");

      // Keep payout flow resilient: invoice generation is best-effort.
      try {
        await InvoiceService.generateInvoice({
          userId: lockedPayout.driver_id,
          relatedId: lockedPayout.id,
          type: "DRIVER_PAYOUT",
          description: "Driver payout",
          amount: lockedPayout.amount,
          currency: "USD"
        });
      } catch (invoiceError) {
        console.warn("Driver payout invoice generation failed:", invoiceError.message);
      }
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
}

module.exports = PaymentService;
