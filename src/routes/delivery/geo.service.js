/**
 * GEO SERVICE
 */
class GeoService {
  static haversine(lat1, lon1, lat2, lon2) {
    const R = 6371;

    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) *
      Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c * 1000;
  }

  static verifyGeofence(driverLat, driverLng, orderLat, orderLng) {
    const lat1 = Number(driverLat);
    const lon1 = Number(driverLng);
    const lat2 = Number(orderLat);
    const lon2 = Number(orderLng);

    const values = [lat1, lon1, lat2, lon2];
    if (!values.every(Number.isFinite)) {
      throw new Error("Invalid coordinates");
    }
    if (lat1 < -90 || lat1 > 90 || lat2 < -90 || lat2 > 90) {
      throw new Error("Invalid latitude");
    }
    if (lon1 < -180 || lon1 > 180 || lon2 < -180 || lon2 > 180) {
      throw new Error("Invalid longitude");
    }

    const distance = this.haversine(lat1, lon1, lat2, lon2);

    if (distance <= 50) {
      return {
        verified: true,
        distance
      };
    }

    return {
      verified: false,
      distance
    };
  }
}

module.exports = GeoService;