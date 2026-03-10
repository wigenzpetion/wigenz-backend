const db = require("../../config/db");

class DispatchRepository {
  static async updateDriverLocation(driverId, lat, lng) {
    const latitude = Number(lat);
    const longitude = Number(lng);

    if (!driverId) {
      throw new Error("Driver ID is required");
    }

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      throw new Error("Invalid location coordinates");
    }

    const updateResult = await db.query(
      `UPDATE driver_locations
       SET latitude = $1,
           longitude = $2,
           updated_at = NOW()
       WHERE driver_id = $3
       RETURNING *`,
      [latitude, longitude, driverId]
    );

    if (updateResult.rows[0]) {
      return updateResult.rows[0];
    }

    const insertResult = await db.query(
      `INSERT INTO driver_locations (driver_id, latitude, longitude)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [driverId, latitude, longitude]
    );

    return insertResult.rows[0];
  }

  /**
   * recherche chauffeurs proches
   */
  static async findNearbyDrivers(prefixes) {
    const result = await db.query(
      `SELECT
        da.driver_id,
        dl.latitude,
        dl.longitude
      FROM driver_availability da
      JOIN driver_locations dl
        ON da.driver_id = dl.driver_id
      WHERE da.geohash_prefix = ANY($1)
      LIMIT 30`,
      [prefixes]
    );

    return result.rows;
  }
}

module.exports = DispatchRepository;