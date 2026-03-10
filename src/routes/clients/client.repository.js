const db = require("../../config/db");

/**
 * Client Repository
 * Responsible ONLY for database queries
 * No business logic here
 */

class ClientRepository {

  // Create new client profile
  static async create(clientData) {
    const {
      user_id,
      first_name,
      last_name,
      phone,
      address,
      city
    } = clientData;

    const query = `
      INSERT INTO clients (
        user_id,
        first_name,
        last_name,
        phone,
        address,
        city
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *;
    `;

    const values = [
      user_id,
      first_name,
      last_name,
      phone,
      address,
      city
    ];

    const { rows } = await db.query(query, values);
    return rows[0];
  }

  // Get client by ID
  static async findById(id) {
    const query = `
      SELECT * FROM clients
      WHERE id = $1;
    `;

    const { rows } = await db.query(query, [id]);
    return rows[0];
  }

  // Get client by user_id
  static async findByUserId(userId) {
    const query = `
      SELECT * FROM clients
      WHERE user_id = $1;
    `;

    const { rows } = await db.query(query, [userId]);
    return rows[0];
  }

  // Get all clients (Admin only)
  static async findAll({ limit = 50, offset = 0 }) {
    const query = `
      SELECT * FROM clients
      ORDER BY created_at DESC
      LIMIT $1 OFFSET $2;
    `;

    const { rows } = await db.query(query, [limit, offset]);
    return rows;
  }

  // Update client
  static async update(id, updateData) {
    const fields = [];
    const values = [];
    let index = 1;

    for (const key in updateData) {
      fields.push(`${key} = $${index}`);
      values.push(updateData[key]);
      index++;
    }

    values.push(id);

    const query = `
      UPDATE clients
      SET ${fields.join(", ")}, updated_at = NOW()
      WHERE id = $${index}
      RETURNING *;
    `;

    const { rows } = await db.query(query, values);
    return rows[0];
  }

  // Delete client
  static async delete(id) {
    const query = `
      DELETE FROM clients
      WHERE id = $1
      RETURNING *;
    `;

    const { rows } = await db.query(query, [id]);
    return rows[0];
  }
}

module.exports = ClientRepository;