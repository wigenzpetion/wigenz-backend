const db = require("../../config/db");
const LedgerService = require("../fintech/ledger.service");
const { Parser } = require("json2csv");

class AdminFintechController {

  static async exportLedger(req, res) {

    const isValid = await LedgerService.verifyLedgerIntegrity();

    if (!isValid) {
      return res.status(500).json({
        message: "Ledger corrupted. Export blocked."
      });
    }

    const result = await db.query(`
      SELECT *
      FROM fintech_ledger_entries
      ORDER BY id ASC
    `);

    const parser = new Parser();
    const csv = parser.parse(result.rows);

    res.header("Content-Type", "text/csv");
    res.attachment("ledger_export.csv");
    return res.send(csv);
  }
}

module.exports = AdminFintechController;