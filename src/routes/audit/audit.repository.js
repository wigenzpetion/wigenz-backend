const db = require("../../config/db");

class AuditRepository {

  static async getLastHash() {
    const result = await db.query(
      `SELECT hash FROM audit_logs
       ORDER BY created_at DESC
       LIMIT 1`
    );
    return result.rows[0]?.hash || null;
  }

  static async create(data) {
    const amount =
      data.amount ??
      data.metadata?.amount ??
      null;

    const previousBalance =
      data.previousBalance ??
      data.metadata?.previousBalance ??
      null;

    const newBalance =
      data.newBalance ??
      data.metadata?.newBalance ??
      null;

    const fraudScore =
      data.fraudScore ??
      data.metadata?.fraudScore ??
      null;

    await db.query(
      `INSERT INTO audit_logs
       (action, user_id, role, entity_type, entity_id,
        amount, previous_balance, new_balance,
        status, fraud_score, ip_address, user_agent,
        previous_hash, hash)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
      [
        data.action,
        data.userId ?? data.actorId ?? null,
        data.role ?? data.actorRole ?? null,
        data.entityType ?? data.targetType ?? null,
        data.entityId ?? data.targetId ?? null,
        amount,
        previousBalance,
        newBalance,
        data.status,
        fraudScore,
        data.ip ?? data.ipAddress ?? null,
        data.userAgent ?? null,
        data.previousHash,
        data.hash
      ]
    );
  }
}

module.exports = AuditRepository;
