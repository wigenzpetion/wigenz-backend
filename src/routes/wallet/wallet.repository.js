const db = require("../../config/db");

class WalletRepository {

  static async findByUserId(userId) {

    const { rows } = await db.query(
      `SELECT * FROM wallets WHERE user_id = $1`,
      [userId]
    );

    return rows[0];
  }

  static async addAvailable(userId, amount) {

    if (amount == null || Number(amount) <= 0) {
      throw new Error("Amount must be a positive number");
    }

    const { rows } = await db.query(
      `UPDATE wallets
       SET available_balance = available_balance + $1,
           updated_at = NOW()
       WHERE user_id = $2
       RETURNING *`,
      [amount, userId]
    );

    return rows[0];
  }

  static async addLocked(userId, amount) {

    if (amount == null || Number(amount) <= 0) {
      throw new Error("Amount must be a positive number");
    }

    const { rows } = await db.query(
      `UPDATE wallets
       SET locked_balance = locked_balance + $1,
           updated_at = NOW()
       WHERE user_id = $2
       RETURNING *`,
      [amount, userId]
    );

    return rows[0];
  }

  static async debitAvailable(userId, amount) {

    if (amount == null || Number(amount) <= 0) {
      throw new Error("Amount must be a positive number");
    }

    const { rows } = await db.query(
      `UPDATE wallets
       SET available_balance = available_balance - $1,
           updated_at = NOW()
       WHERE user_id = $2
         AND available_balance >= $1
       RETURNING *`,
      [amount, userId]
    );

    if (!rows[0]) {
      throw new Error("Insufficient balance");
    }

    return rows[0];
  }

}

module.exports = WalletRepository;