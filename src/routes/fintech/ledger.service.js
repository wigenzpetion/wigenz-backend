const crypto = require("crypto");
const db = require("../../config/db");

class LedgerService {

  static async getLastHash(client) {
    const result = await client.query(`
      SELECT hash
      FROM fintech_ledger_entries
      ORDER BY id DESC
      LIMIT 1
    `);

    return result.rows.length > 0
      ? result.rows[0].hash
      : null;
  }

  static generateHash(dataString) {
    return crypto
      .createHash("sha256")
      .update(dataString)
      .digest("hex");
  }

  static async createEntry({
    referenceId,
    referenceType,
    debitAccountId,
    creditAccountId,
    amount,
    metadata = {}
  }) {

    const client = await db.pool.connect();

    try {

      await client.query("BEGIN");

      const previousHash = await this.getLastHash(client);

      const dataString =
        `${referenceId}|${referenceType}|${debitAccountId}|${creditAccountId}|${amount}|${previousHash}`;

      const hash = this.generateHash(dataString);

      await client.query(`
        INSERT INTO fintech_ledger_entries
        (
          reference_id,
          reference_type,
          debit_account_id,
          credit_account_id,
          amount,
          previous_hash,
          hash,
          metadata
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
      `, [
        referenceId,
        referenceType,
        debitAccountId,
        creditAccountId,
        amount,
        previousHash,
        hash,
        metadata
      ]);

      await client.query("COMMIT");

    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  static async verifyLedgerIntegrity() {

    const client = await db.pool.connect();

    try {

      const result = await client.query(`
        SELECT *
        FROM fintech_ledger_entries
        ORDER BY id ASC
      `);

      let previousHash = null;

      for (const row of result.rows) {

        const dataString =
          `${row.reference_id}|${row.reference_type}|${row.debit_account_id}|${row.credit_account_id}|${row.amount}|${previousHash}`;

        const recalculatedHash =
          this.generateHash(dataString);

        if (recalculatedHash !== row.hash) {
          return false;
        }

        previousHash = row.hash;
      }

      return true;

    } finally {
      client.release();
    }
  }
}

module.exports = LedgerService;