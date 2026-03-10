/**
 * PHOTO SERVICE
 *
 * protège contre :
 * - photo ancienne
 * - photo prise ailleurs
 * - photo importée
 */

class PhotoService {

  /**
   * validation photo simple
   */

  static validatePhoto(photo){

    if(!photo){
      throw new Error("Delivery photo required");
    }

    return true;

  }

  /**
   * validation metadata photo
   */

  static validatePhotoMetadata(photoMeta, driverLocation) {

    if (!photoMeta) {
      throw new Error("Photo metadata missing");
    }

    /**
     * vérifier timestamp photo (anti-fraude)
     */

    const photoTime = new Date(photoMeta.timestamp);
    const now = new Date();

    const diffSeconds =
      (now - photoTime) / 1000;

    if (isNaN(diffSeconds) || diffSeconds > 120) {
      throw new Error("Photo too old");
    }

    /**
     * vérifier GPS photo
     */

    if (!photoMeta.lat || !photoMeta.lng) {
      throw new Error("Photo GPS missing");
    }

    if (!driverLocation || driverLocation.lat == null || driverLocation.lng == null) {
      throw new Error("Driver location required for photo validation");
    }

    const distance =
      this.haversine(
        Number(photoMeta.lat),
        Number(photoMeta.lng),
        Number(driverLocation.lat),
        Number(driverLocation.lng)
      );

    if (distance > 50) {
      throw new Error("Photo location invalid");
    }

    return true;

  }

  /**
   * distance GPS
   */

  static haversine(lat1,lon1,lat2,lon2){

    const R=6371;

    const dLat=(lat2-lat1)*Math.PI/180;
    const dLon=(lon2-lon1)*Math.PI/180;

    const a=
      Math.sin(dLat/2)*Math.sin(dLat/2)+
      Math.cos(lat1*Math.PI/180)*
      Math.cos(lat2*Math.PI/180)*
      Math.sin(dLon/2)*
      Math.sin(dLon/2);

    const c=2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));

    return R*c*1000;

  }

}

module.exports = PhotoService;