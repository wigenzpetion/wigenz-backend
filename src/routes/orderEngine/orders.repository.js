const db = require("../../config/db");

class OrdersRepository {
  static async create(data) {
    const {
      user_id,
      pickup_address,
      pickup_lat,
      pickup_lng,
      delivery_address,
      delivery_lat,
      delivery_lng,
      status = "CREATED"
    } = data;

    const { rows } = await db.query(
      `INSERT INTO orders
       (user_id, pickup_address, pickup_lat, pickup_lng, delivery_address, delivery_lat, delivery_lng, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [user_id, pickup_address, pickup_lat, pickup_lng, delivery_address, delivery_lat, delivery_lng, status]
    );

    return rows[0];
  }

  static async getById(id) {
    const { rows } = await db.query("SELECT * FROM orders WHERE id = $1", [id]);
    return rows[0];
  }
}

module.exports = OrdersRepository;