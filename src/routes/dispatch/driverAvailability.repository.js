const db = require("../../config/db");

class DriverAvailabilityRepository {

  /**
   * chauffeur disponible
   */
  static async markDriverAvailable(driverId, prefix) {

    await db.query(`
      INSERT INTO driver_availability
      (driver_id, geohash_prefix)
      VALUES ($1,$2)

      ON CONFLICT(driver_id)
      DO UPDATE SET
      geohash_prefix=$2,
      updated_at=NOW()
    `,[driverId,prefix]);

  }

  /**
   * chauffeur occupé
   */
  static async markDriverBusy(driverId) {

    await db.query(`
      DELETE FROM driver_availability
      WHERE driver_id=$1
    `,[driverId]);

  }

}

module.exports = DriverAvailabilityRepository;