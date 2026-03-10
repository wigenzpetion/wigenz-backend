const db = require("../../config/db");

class PaymentRepository {

  static async create(data) {
    const {
      order_id,
      user_id,
      amount,
      currency,
      payment_method,
      transaction_id,
      status,
      idempotency_key
    } = data;

    const query = `
      INSERT INTO payments (
        order_id,
        user_id,
        amount,
        currency,
        payment_method,
        transaction_id,
        status,
        idempotency_key
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
      ON CONFLICT (user_id, idempotency_key)
      DO UPDATE SET updated_at = payments.updated_at
      RETURNING *;
    `;

    const { rows } = await db.query(query, [
      order_id,
      user_id,
      amount,
      currency || "USD",
      payment_method,
      transaction_id,
      status || "PENDING",
      idempotency_key || null
    ]);

    return rows[0];
  }

  static async findByUserAndIdempotency(userId, idempotencyKey) {
    const { rows } = await db.query(
      `SELECT * FROM payments
       WHERE user_id = $1
         AND idempotency_key = $2
       LIMIT 1`,
      [userId, idempotencyKey]
    );
    return rows[0];
  }

  static async findById(id) {
    const { rows } = await db.query(
      `SELECT * FROM payments WHERE id = $1`,
      [id]
    );
    return rows[0];
  }

  static async findByUser(userId) {
    const { rows } = await db.query(
      `SELECT * FROM payments WHERE user_id = $1 ORDER BY created_at DESC`,
      [userId]
    );
    return rows;
  }

  static async findAll({ limit = 50, offset = 0 }) {
    const { rows } = await db.query(
      `SELECT * FROM payments
       ORDER BY created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    return rows;
  }

  static async updateStatus(id, status) {
    const { rows } = await db.query(
      `UPDATE payments
       SET status = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [status, id]
    );
    return rows[0];
  }
}

module.exports = PaymentRepository;
