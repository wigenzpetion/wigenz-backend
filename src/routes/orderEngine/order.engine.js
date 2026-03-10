const eventBus = require("../../core/eventBus");
const db = require("../../config/db");

class OrderEngine {

  static async changeStatus(orderId, newStatus, actor) {

    const client = await db.pool.connect();

    try {
      await client.query("BEGIN");

      const result = await client.query(
        `SELECT * FROM orders WHERE id = $1 FOR UPDATE`,
        [orderId]
      );

      const order = result.rows[0];
      if (!order) throw new Error("Order not found");

      // Vérifier chauffeur assigné
      if (actor.role === "DRIVER" && order.driver_id !== actor.id) {
        throw new Error("Driver not assigned to this order");
      }

      if (!OrderEngine.isValidTransition(order.status, newStatus)) {
        throw new Error("Invalid status transition");
      }

      await client.query(
        `UPDATE orders
         SET status = $1, updated_at = NOW()
         WHERE id = $2`,
        [newStatus, orderId]
      );

      await client.query("COMMIT");

      const updatedOrder = { ...order, status: newStatus };

      eventBus.emit(`ORDER_${newStatus}`, updatedOrder);

      return updatedOrder;

    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }

  static isValidTransition(current, next) {
    const transitions = {
      ACCEPTED: ["PICKED_UP"],
      PICKED_UP: ["IN_TRANSIT"],
      IN_TRANSIT: ["DELIVERY_PENDING_VERIFICATION"],
      DELIVERY_PENDING_VERIFICATION: ["DELIVERED"],
      DELIVERED: [],
      CANCELLED: []
    };

    return transitions[current]?.includes(next);
  }
}

module.exports = OrderEngine;