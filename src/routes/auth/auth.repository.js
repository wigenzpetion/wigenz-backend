const db = require("../../config/db");

class AuthRepository {

  static async findByEmail(email) {
    const result = await db.query(
      "SELECT * FROM users WHERE email = $1",
      [email]
    );
    return result.rows[0];
  }

  static async create(user) {
    const result = await db.query(
      `INSERT INTO users (name, email, password, role)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [user.name, user.email, user.password, user.role]
    );
    return result.rows[0];
  }
}

module.exports = AuthRepository;