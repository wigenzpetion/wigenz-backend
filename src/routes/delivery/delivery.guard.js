/**
 * DELIVERY GUARD
 *
 * Ce module protège la validation de livraison.
 * Il empêche le chauffeur de cliquer "Livré"
 * tant que les preuves ne sont pas validées.
 *
 * WIGENZ utilise plusieurs preuves :
 *
 * - Photo colis
 * - GPS validation
 * - Signature chauffeur
 * - OTP client (si présent)
 *
 * CAS NORMAL
 * photo + gps + (signature OU otp)
 *
 * CAS GPS IMPRÉCIS
 * photo + OTP obligatoire
 *
 * Protection anti fraude ajoutée :
 * - vérification metadata photo
 * - distance GPS photo
 */

const { validatePhotoMetadata } = require("./photo.service");

function validateDelivery(data) {

  /**
   * vérifier photo obligatoire
   */

  if (!data.photo) {
    throw new Error("Delivery photo required");
  }

  /**
   * vérifier metadata photo
   * empêche utilisation photo ancienne
   */

  if (data.photo_metadata) {

    validatePhotoMetadata(
      data.photo_metadata,
      {
        lat: data.driver_lat,
        lng: data.driver_lng
      }
    );

  }

  /**
   * CAS NORMAL
   * GPS correct
   */

  if (data.gps_verified) {

    if (
      data.driver_signature ||
      data.otp
    ) {
      return true;
    }

  }

  /**
   * CAS EXCEPTIONNEL
   * GPS imprécis
   * OTP obligatoire
   */

  if (data.gps_issue) {

    if (data.photo && data.otp) {
      return true;
    }

  }

  /**
   * sinon refus livraison
   */

  throw new Error("Delivery validation failed");

}

module.exports = {
  validateDelivery
};