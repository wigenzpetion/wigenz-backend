const db = require("../../config/db");

class DriverRepository {

  static async create(data) {
    const {
      user_id,
      vehicle_type,
      vehicle_plate,
      license_number,
      status
    } = data;

    const query = `
      INSERT INTO drivers (
        user_id,
        vehicle_type,
        vehicle_plate,
        license_number,
        status
      )
      VALUES ($1,$2,$3,$4,$5)
      RETURNING *;
    `;

    const { rows } = await db.query(query, [
      user_id,
      vehicle_type,
      vehicle_plate,
      license_number,
      status || "PENDING"
    ]);

    return rows[0];
  }

  static async findById(id) {
    const { rows } = await db.query(
      `SELECT * FROM drivers WHERE id = $1`,
      [id]
    );
    return rows[0];
  }

  static async findByUserId(userId) {
    const { rows } = await db.query(
      `SELECT * FROM drivers WHERE user_id = $1`,
      [userId]
    );
    return rows[0];
  }

  static async findAll({ limit = 50, offset = 0 }) {
    const { rows } = await db.query(
      `SELECT * FROM drivers
       ORDER BY created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    return rows;
  }

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
      UPDATE drivers
      SET ${fields.join(", ")}, updated_at = NOW()
      WHERE id = $${index}
      RETURNING *;
    `;

    const { rows } = await db.query(query, values);
    return rows[0];
  }

  static async delete(id) {
    const { rows } = await db.query(
      `DELETE FROM drivers WHERE id = $1 RETURNING *`,
      [id]
    );
    return rows[0];
  }
}

module.exports = DriverRepository;