const db = require("../../config/db");
const { calculateDistanceMeters, validateGPS } = require("../../utils/gps.util");

class DeliveryProofService {

  static async createProof(orderId, driver, data) {

    const client = await db.pool.connect();

    try {
      await client.query("BEGIN");

      const orderRes = await client.query(
        `SELECT * FROM orders WHERE id = $1 FOR UPDATE`,
        [orderId]
      );

      const order = orderRes.rows[0];
      if (!order) throw new Error("Order not found");

      if (order.status !== "PICKED_UP")
        throw new Error("Order not ready for delivery");

      if (order.driver_id !== driver.id)
        throw new Error("Driver not assigned");

      // Calcul distance GPS
      const distance = calculateDistanceMeters(
        data.lat,
        data.lng,
        order.destination_lat,
        order.destination_lng
      );

      const gpsValid = validateGPS(distance, data.accuracy);

      await client.query(
        `INSERT INTO delivery_proofs
        (order_id, driver_id, photo_url, signature_url,
         gps_lat, gps_lng, gps_accuracy,
         distance_from_destination, gps_valid,
         device_id, ip_address)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
        [
          orderId,
          driver.id,
          data.photoUrl,
          data.signatureUrl,
          data.lat,
          data.lng,
          data.accuracy,
          distance,
          gpsValid,
          data.deviceId,
          data.ipAddress
        ]
      );

      await client.query("COMMIT");

      return {
        gpsValid,
        distance
      };

    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }
}

module.exports = DeliveryProofService;