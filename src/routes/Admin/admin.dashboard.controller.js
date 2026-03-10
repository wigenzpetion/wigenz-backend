const db = require("../../config/db");

class AdminDashboardController {

  static async getFinanceDashboard(req, res) {

    const revenue = await db.query(`
      SELECT SUM(amount) 
      FROM ledger_entries
      WHERE reference_type = 'DELIVERY'
    `);

    const subscriptions = await db.query(`
      SELECT SUM(amount)
      FROM ledger_entries
      WHERE reference_type = 'SUBSCRIPTION'
    `);

    const exportsCount = await db.query(`
      SELECT COUNT(*)
      FROM finance_export_logs
      WHERE exported_at > NOW() - INTERVAL '24 hours'
    `);

    res.json({
      deliveryRevenue: revenue.rows[0].sum || 0,
      subscriptionRevenue: subscriptions.rows[0].sum || 0,
      exportsLast24h: exportsCount.rows[0].count
    });
  }
}

module.exports = AdminDashboardController;