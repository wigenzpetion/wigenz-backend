// src/modules/admin/audit.controller.js

const db = require("../../config/db");

function toCsv(rows) {
  if (!rows.length) {
    return "";
  }

  const headers = Object.keys(rows[0]);
  const escape = (value) => {
    if (value === null || value === undefined) {
      return "";
    }
    const s = String(value).replace(/"/g, "\"\"");
    return `"${s}"`;
  };

  const body = rows.map((row) => headers.map((h) => escape(row[h])).join(","));
  return [headers.join(","), ...body].join("\n");
}

class AuditController {

  static async exportCSV(req, res, next) {
    try {

      const { start, end } = req.query;

      const result = await db.query(
        `SELECT created_at, action, user_id, amount, status, ip_address
         FROM audit_logs
         WHERE created_at BETWEEN $1 AND $2
         ORDER BY created_at DESC`,
        [start, end]
      );

      let csv;
      try {
        const { Parser } = require("json2csv");
        const parser = new Parser();
        csv = parser.parse(result.rows);
      } catch (err) {
        csv = toCsv(result.rows);
      }

      res.header("Content-Type", "text/csv");
      res.attachment("audit_logs.csv");

      return res.send(csv);

    } catch (error) {
      next(error);
    }
  }
}

module.exports = AuditController;
