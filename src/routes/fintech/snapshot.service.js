const db = require("../../config/db");
const crypto = require("crypto");

class SnapshotService {

  static async createDailySnapshot() {

    const result = await db.query(`
      SELECT hash
      FROM ledger_entries
      ORDER BY id DESC
      LIMIT 1
    `);

    if (!result.rows.length) return;

    const lastHash = result.rows[0].hash;

    const snapshotHash = crypto
      .createHash("sha256")
      .update(lastHash + new Date().toISOString())
      .digest("hex");

    await db.query(`
      INSERT INTO ledger_daily_snapshots
      (snapshot_date, last_entry_id, snapshot_hash)
      VALUES (CURRENT_DATE, 
             (SELECT MAX(id) FROM ledger_entries),
              $1)
      ON CONFLICT (snapshot_date) DO NOTHING
    `, [snapshotHash]);
  }
}

module.exports = SnapshotService;