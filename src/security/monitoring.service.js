const db = require("../../config/db");
const EmailService = require("../notifications/email.service");

class MonitoringService {

  static async checkExportAbuse(userId) {

    const result = await db.query(`
      SELECT COUNT(*)
      FROM finance_export_logs
      WHERE user_id = $1
      AND exported_at > NOW() - INTERVAL '1 hour'
    `, [userId]);

    if (parseInt(result.rows[0].count) > 5) {

      await EmailService.sendAlert(
        process.env.SUPER_ADMIN_EMAIL,
        "ALERTE EXPORT FINANCE",
        `Utilisateur ${userId} exporte trop souvent.`
      );
    }
  }
}

module.exports = MonitoringService;