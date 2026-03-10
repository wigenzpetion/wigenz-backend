const db = require("../config/db");

class RoleService {
  static async assignRole(userId, roleCode) {
    const normalizedRoleCode = String(roleCode || "").toUpperCase();

    const role = await db.query(
      "SELECT id FROM system_roles WHERE role_code = $1",
      [normalizedRoleCode]
    );

    if (!role.rows.length) {
      throw new Error("Role not found");
    }

    await db.query(
      `
      INSERT INTO user_roles (user_id, role_id)
      VALUES ($1, $2)
      ON CONFLICT DO NOTHING
      `,
      [userId, role.rows[0].id]
    );
  }

  static async setRoles(userId, roleCodes = []) {
    const client = await db.pool.connect();

    try {
      await client.query("BEGIN");
      await client.query("DELETE FROM user_roles WHERE user_id = $1", [userId]);

      for (const roleCode of roleCodes) {
        const normalizedRoleCode = String(roleCode || "").toUpperCase();
        const role = await client.query(
          "SELECT id FROM system_roles WHERE role_code = $1",
          [normalizedRoleCode]
        );

        if (!role.rows.length) {
          throw new Error(`Role not found: ${normalizedRoleCode}`);
        }

        await client.query(
          `
          INSERT INTO user_roles (user_id, role_id)
          VALUES ($1, $2)
          ON CONFLICT DO NOTHING
          `,
          [userId, role.rows[0].id]
        );
      }

      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
}

module.exports = RoleService;
