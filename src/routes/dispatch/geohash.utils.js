const ngeohash = require("ngeohash");

/**
 * Encode latitude / longitude en geohash
 */
function encodeLocation(lat, lng, precision = 7) {
  return ngeohash.encode(lat, lng, precision);
}

/**
 * prefix utilisé pour index PostgreSQL
 */
function getPrefix(hash) {
  return hash.substring(0, 6);
}

/**
 * zones voisines
 */
function getNeighbors(hash) {
  return ngeohash.neighbors(hash);
}

module.exports = {
  encodeLocation,
  getPrefix,
  getNeighbors
};