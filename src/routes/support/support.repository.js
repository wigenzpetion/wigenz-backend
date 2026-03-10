const db = require("../../config/db");

const SUPPORT_ROLE_CODES = [
  "SUPPORT",
  "SUPPORT_AGENT",
  "SUPPORT_ADMIN",
  "ADMIN",
  "SUPER_ADMIN"
];

class SupportRepository {

  static async createTicket({ user_id, order_id, subject, message, author_role, priority, category }) {
    const { rows } = await db.query(
      `INSERT INTO support_tickets (user_id, order_id, subject, status, author_role, priority, category)
       VALUES ($1, $2, $3, 'OPEN', $4, $5, $6)
       RETURNING *`,
      [
        user_id,
        order_id || null,
        subject,
        author_role || "CLIENT",
        priority || "MEDIUM",
        category || "AUTRE"
      ]
    );
    const ticket = rows[0];
    if (ticket && message) {
      await db.query(
        `INSERT INTO support_ticket_replies (ticket_id, author_id, author_type, message)
         VALUES ($1, $2, $3, $4)`,
        [ticket.id, user_id, author_role || "CLIENT", message]
      );
    }

    if (ticket) {
      await db.query(
        `
        INSERT INTO resource_assignments (resource_type, resource_id, user_id, relation, metadata)
        SELECT 'support_ticket', $1, $2, 'REQUESTER', jsonb_build_object('source', 'support_ticket_create')
        WHERE NOT EXISTS (
          SELECT 1
          FROM resource_assignments
          WHERE resource_type = 'support_ticket'
            AND resource_id = $1
            AND user_id = $2
            AND relation = 'REQUESTER'
            AND ends_at IS NULL
        )
        `,
        [ticket.id, user_id]
      );
    }

    return ticket;
  }

  static async findById(id) {
    const { rows } = await db.query(
      `SELECT * FROM support_tickets WHERE id = $1`,
      [id]
    );
    return rows[0];
  }

  static async findByUserId(userId) {
    const { rows } = await db.query(
      `SELECT * FROM support_tickets WHERE user_id = $1 ORDER BY created_at DESC`,
      [userId]
    );
    return rows;
  }

  static async findAll(filters = {}) {
    let query = `SELECT t.*, u.email as user_email
                 FROM support_tickets t
                 LEFT JOIN users u ON u.id = t.user_id
                 WHERE 1=1`;
    const params = [];
    let i = 1;
    if (filters.status) {
      query += ` AND t.status = $${i}`;
      params.push(filters.status);
      i++;
    }
    if (filters.priority) {
      query += ` AND t.priority = $${i}`;
      params.push(filters.priority);
      i++;
    }
    if (filters.category) {
      query += ` AND t.category = $${i}`;
      params.push(filters.category);
      i++;
    }
    query += ` ORDER BY t.updated_at DESC`;
    const { rows } = await db.query(query, params);
    return rows;
  }

  static async updateStatus(id, status, resolvedBy = null) {
    const { rows } = await db.query(
      `UPDATE support_tickets
       SET status = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [status, id]
    );
    if (rows[0] && status === "RESOLVED") {
      await db.query(
        `UPDATE support_tickets SET resolved_at = NOW(), resolved_by = $1 WHERE id = $2`,
        [resolvedBy, id]
      );
      rows[0].resolved_at = new Date();
      rows[0].resolved_by = resolvedBy;
    }
    return rows[0];
  }

  static async assign(ticketId, assignedTo) {
    const client = await db.pool.connect();

    try {
      await client.query("BEGIN");

      const { rows } = await client.query(
        `UPDATE support_tickets
         SET assigned_to = $1, updated_at = NOW(), status = 'IN_PROGRESS'
         WHERE id = $2
         RETURNING *`,
        [assignedTo, ticketId]
      );

      const ticket = rows[0];
      if (!ticket) {
        await client.query("ROLLBACK");
        return null;
      }

      await client.query(
        `
        UPDATE resource_assignments
        SET ends_at = NOW()
        WHERE resource_type = 'support_ticket'
          AND resource_id = $1
          AND relation = 'ASSIGNEE'
          AND ends_at IS NULL
          AND user_id <> $2
        `,
        [ticketId, assignedTo]
      );

      await client.query(
        `
        INSERT INTO resource_assignments (resource_type, resource_id, user_id, relation, metadata)
        SELECT 'support_ticket', $1, $2, 'ASSIGNEE', jsonb_build_object('source', 'support_ticket_assign')
        WHERE NOT EXISTS (
          SELECT 1
          FROM resource_assignments
          WHERE resource_type = 'support_ticket'
            AND resource_id = $1
            AND user_id = $2
            AND relation = 'ASSIGNEE'
            AND ends_at IS NULL
        )
        `,
        [ticketId, assignedTo]
      );

      await client.query("COMMIT");
      return ticket;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  static async addReply({ ticket_id, author_id, author_type, message }) {
    const { rows } = await db.query(
      `INSERT INTO support_ticket_replies (ticket_id, author_id, author_type, message)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [ticket_id, author_id, author_type, message]
    );
    await db.query(
      `UPDATE support_tickets SET updated_at = NOW() WHERE id = $1`,
      [ticket_id]
    );
    return rows[0];
  }

  static async getReplies(ticketId) {
    const { rows } = await db.query(
      `SELECT * FROM support_ticket_replies WHERE ticket_id = $1 ORDER BY created_at ASC`,
      [ticketId]
    );
    return rows;
  }

  static async addAttachment({ ticket_id, reply_id, file_name, file_path, uploaded_by }) {
    const { rows } = await db.query(
      `INSERT INTO support_ticket_attachments (ticket_id, reply_id, file_name, file_path, uploaded_by)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [ticket_id, reply_id || null, file_name, file_path, uploaded_by]
    );
    return rows[0];
  }

  static async getAttachmentsByTicketId(ticketId) {
    const { rows } = await db.query(
      `SELECT * FROM support_ticket_attachments WHERE ticket_id = $1 ORDER BY created_at ASC`,
      [ticketId]
    );
    return rows;
  }

  static async hasActiveAssigneeRelation(ticketId, userId) {
    const { rows } = await db.query(
      `
      SELECT 1
      FROM resource_assignments
      WHERE resource_type = 'support_ticket'
        AND resource_id = $1
        AND user_id = $2
        AND relation = 'ASSIGNEE'
        AND ends_at IS NULL
      LIMIT 1
      `,
      [ticketId, userId]
    );

    return rows.length > 0;
  }

  static async hasActiveManagerLink(managerUserId, userId) {
    const { rows } = await db.query(
      `
      SELECT 1
      FROM user_manager_links
      WHERE manager_user_id = $1
        AND user_id = $2
        AND ends_at IS NULL
      LIMIT 1
      `,
      [managerUserId, userId]
    );

    return rows.length > 0;
  }

  static async sharesSupportTeam(userAId, userBId) {
    const { rows } = await db.query(
      `
      SELECT 1
      FROM user_team_memberships m1
      JOIN user_team_memberships m2 ON m2.team_id = m1.team_id
      JOIN teams t ON t.id = m1.team_id
      WHERE m1.user_id = $1
        AND m2.user_id = $2
        AND m1.ends_at IS NULL
        AND m2.ends_at IS NULL
        AND t.is_active = TRUE
        AND t.team_type = 'SUPPORT'
      LIMIT 1
      `,
      [userAId, userBId]
    );

    return rows.length > 0;
  }

  static async findSupportEligibleUser(userId) {
    const { rows } = await db.query(
      `
      SELECT u.id, u.role
      FROM users u
      WHERE u.id = $1
        AND (
          UPPER(u.role) = ANY($2::text[])
          OR EXISTS (
            SELECT 1
            FROM user_roles ur
            JOIN system_roles sr ON sr.id = ur.role_id
            WHERE ur.user_id = u.id
              AND sr.role_code = ANY($2::text[])
          )
        )
      LIMIT 1
      `,
      [userId, SUPPORT_ROLE_CODES]
    );

    return rows[0] || null;
  }
}

module.exports = SupportRepository;
