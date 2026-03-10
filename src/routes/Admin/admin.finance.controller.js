const db = require("../../config/db");
const LedgerService = require("../fintech/ledger.service");
const eventBus = require("../../core/eventBus");
const { Parser } = require("json2csv");

class AdminFinanceController {

  // ==============================
  // 1️⃣ Demande d’export (double validation)
  // ==============================
  static async requestExport(req, res) {

    await db.query(`
      INSERT INTO finance_export_requests (requested_by)
      VALUES ($1)
    `, [req.user.id]);

    res.json({ message: "Export request submitted for approval" });
  }

  // ==============================
  // 2️⃣ Approbation export (2e signature)
  // ==============================
  static async approveExport(req, res) {

    const { requestId } = req.body;

    await db.query(`
      UPDATE finance_export_requests
      SET status = 'APPROVED',
          approved_by = $1,
          approved_at = NOW()
      WHERE id = $2
      AND status = 'PENDING'
    `, [req.user.id, requestId]);

    res.json({ message: "Export approved" });
  }

  // ==============================
  // 3️⃣ Export Ledger sécurisé
  // ==============================
  static async exportLedger(req, res) {

    // 🔔 1. Limite export 5 fois par heure
    const count = await db.query(`
      SELECT COUNT(*)
      FROM finance_export_logs
      WHERE user_id = $1
      AND exported_at > NOW() - INTERVAL '1 hour'
    `, [req.user.id]);

    if (parseInt(count.rows[0].count) > 5) {

      // Event d'alerte sécurité
      eventBus.emit("FINANCE_EXPORT_ALERT", {
        actorId: req.user.id,
        reason: "Too many exports in 1 hour"
      });

      return res.status(403).json({
        message: "Too many exports. Alert triggered."
      });
    }

    // 🔐 2. Vérification intégrité ledger
    const integrity = await LedgerService.verifyLedgerIntegrity();

    if (!integrity) {
      return res.status(500).json({
        message: "Ledger corrupted. Export blocked."
      });
    }

    // 🔐 3. Vérifier qu’un export est approuvé
    const approved = await db.query(`
      SELECT *
      FROM finance_export_requests
      WHERE requested_by = $1
      AND status = 'APPROVED'
      ORDER BY approved_at DESC
      LIMIT 1
    `, [req.user.id]);

    if (!approved.rows.length) {
      return res.status(403).json({
        message: "No approved export request found."
      });
    }

    // 📜 4. Log export
    await db.query(`
      INSERT INTO finance_export_logs (user_id)
      VALUES ($1)
    `, [req.user.id]);

    // 📊 5. Récupérer ledger
    const result = await db.query(`
      SELECT l.id,
             l.reference_id,
             l.reference_type,
             l.amount,
             l.previous_hash,
             l.hash,
             l.created_at,
             da.account_name AS debit_account,
             ca.account_name AS credit_account
      FROM fintech_ledger_entries l
      JOIN fintech_accounts da ON da.id = l.debit_account_id
      JOIN fintech_accounts ca ON ca.id = l.credit_account_id
      ORDER BY l.id ASC
    `);

    const parser = new Parser();
    const csv = parser.parse(result.rows);

    res.header("Content-Type", "text/csv");
    res.attachment("ledger_export.csv");
    return res.send(csv);
  }
}

module.exports = AdminFinanceController;