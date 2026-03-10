const DispatchRepository = require("./dispatch.repository");
const { rankDrivers } = require("./dispatch.algorithm");
const { encodeLocation, getPrefix, getNeighbors } = require("./geohash.utils");
const AppError = require("../../core/errors");

class DispatchService {

  /**
   * dispatch principal
   */
  static async dispatch(order){

    if (!order) {
      throw new AppError("Order is required", 400);
    }

    const lat = Number(order.pickup_lat);
    const lng = Number(order.pickup_lng);
    if (lat == null || lng == null || isNaN(lat) || isNaN(lng)) {
      throw new AppError("Valid pickup_lat and pickup_lng are required", 400);
    }

    const hash = encodeLocation(lat, lng, 7);

    const prefix = getPrefix(hash);

    const neighbors = getNeighbors(hash);

    const prefixes = [
      prefix,
      ...neighbors.map(n=>n.substring(0,6))
    ];

    const drivers =
      await DispatchRepository.findNearbyDrivers(prefixes);

    if(!drivers.length){
      throw new AppError("No drivers nearby", 404);
    }

    const ranked =
      rankDrivers(drivers,{
        lat,
        lng
      });

    return ranked.slice(0,5);
  }

}

module.exports = DispatchService;