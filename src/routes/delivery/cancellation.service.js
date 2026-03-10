const db = require("../../config/db");

/**
 * CANCELLATION SERVICE
 *
 * Annulation compensee :
 * - protege le chauffeur si le client annule apres deplacement
 * - seul le client proprietaire de la commande peut annuler
 */

class CancellationService {
  static async cancelOrder(orderId, clientId) {
    if (!orderId || !clientId) {
      throw new Error("Order ID and client ID are required");
    }

    const client = await db.pool.connect();

    try {
      await client.query("BEGIN");

      const result = await client.query(
        `SELECT *
         FROM orders
         WHERE id = $1
         FOR UPDATE`,
        [orderId]
      );

      if (!result.rows.length) {
        throw new Error("Order not found");
      }

      const order = result.rows[0];

      const orderOwnerId = order.user_id ?? order.client_id;
      if (orderOwnerId != null && String(orderOwnerId) !== String(clientId)) {
        throw new Error("Unauthorized");
      }

      if (order.status === "CANCELLED") {
        await client.query("ROLLBACK");
        return;
      }

      if (!order.driver_id) {
        await client.query(
          `UPDATE orders
           SET status = 'CANCELLED',
               updated_at = NOW()
           WHERE id = $1`,
          [orderId]
        );
        await client.query("COMMIT");
        return;
      }

      const moved = await client.query(
        `SELECT 1
         FROM driver_locations
         WHERE driver_id = $1`,
        [order.driver_id]
      );

      if (moved.rows.length) {
        const approachFee = 5;

        const debitResult = await client.query(
          `UPDATE wallets
           SET available_balance = available_balance - $1,
               updated_at = NOW()
           WHERE user_id = $2
             AND available_balance >= $1
           RETURNING *`,
          [approachFee, clientId]
        );

        if (!debitResult.rows[0]) {
          throw new Error("Insufficient balance for cancellation fee");
        }

        const creditResult = await client.query(
          `UPDATE wallets
           SET available_balance = available_balance + $1,
               updated_at = NOW()
           WHERE user_id = $2
           RETURNING *`,
          [approachFee, order.driver_id]
        );

        if (!creditResult.rows[0]) {
          throw new Error("Driver wallet not found");
        }

        await client.query(
          `INSERT INTO cancellation_fees
           (order_id, driver_id, amount)
           VALUES ($1, $2, $3)`,
          [orderId, order.driver_id, approachFee]
        );
      }

      await client.query(
        `UPDATE orders
         SET status = 'CANCELLED',
             updated_at = NOW()
         WHERE id = $1`,
        [orderId]
      );

      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
}

module.exports = CancellationService;