const db = require("../../config/db");

class PayoutRepository {

  // ==============================
  // CREATE PAYOUT
  // ==============================
  static async create(data) {

    const { driver_id, amount, payment_method, order_id } = data;

    const query = `
      INSERT INTO payouts
      (driver_id, amount, payment_method, order_id, status)
      VALUES ($1,$2,$3,$4,'PENDING')
      RETURNING *
    `;

    const { rows } = await db.query(query, [
      driver_id,
      amount,
      payment_method,
      order_id
    ]);

    return rows[0];
  }

  // ==============================
  // FIND BY ID
  // ==============================
  static async findById(id) {

    const { rows } = await db.query(
      `SELECT * FROM payouts WHERE id = $1`,
      [id]
    );

    return rows[0];
  }

  // ==============================
  // FIND BY DRIVER
  // ==============================
  static async findByDriver(driverId) {

    const { rows } = await db.query(
      `SELECT * FROM payouts
       WHERE driver_id = $1
       ORDER BY created_at DESC`,
      [driverId]
    );

    return rows;
  }

  // ==============================
  // ADMIN LIST
  // ==============================
  static async findAll({ limit = 50, offset = 0 }) {

    const { rows } = await db.query(
      `SELECT * FROM payouts
       ORDER BY created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    return rows;
  }

  // ==============================
  // UPDATE STATUS
  // ==============================
  static async updateStatus(id, status) {

    const { rows } = await db.query(
      `UPDATE payouts
       SET status = $1,
           updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [status, id]
    );

    return rows[0];
  }

  // ==============================
  // FIND ELIGIBLE PAYOUTS (24H)
  // ==============================
  static async findEligibleForProcessing() {

    const { rows } = await db.query(`
      SELECT *
      FROM payouts
      WHERE status = 'PENDING'
      AND created_at <= NOW() - INTERVAL '10 hours'
      FOR UPDATE SKIP LOCKED
    `);

    return rows;
  }

  // ==============================
  // MARK PROCESSING
  // ==============================
  static async markProcessing(id) {

    await db.query(`
      UPDATE payouts
      SET status = 'PROCESSING'
      WHERE id = $1
    `, [id]);

  }

  // ==============================
  // MARK PAID
  // ==============================
  static async markPaid(id) {

    await db.query(`
      UPDATE payouts
      SET status = 'PAID',
          processed_at = NOW()
      WHERE id = $1
    `, [id]);

  }

}

module.exports = PayoutRepository;
