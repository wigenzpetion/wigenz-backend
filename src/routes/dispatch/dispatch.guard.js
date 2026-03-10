/**
 * DISPATCH GUARD
 *
 * Vérifie si un chauffeur peut recevoir une commande.
 *
 * protège contre :
 *
 * - chauffeur suspendu
 * - chauffeur frauduleux
 * - chauffeur occupé
 * - abonnement expiré
 * - double assignation
 */

function canReceiveOrder(driver) {

  /**
   * chauffeur actif
   */

  if (driver.status !== "ACTIVE") {
    return false;
  }

  /**
   * abonnement actif
   */

  if (driver.subscription_status !== "ACTIVE") {
    return false;
  }

  /**
   * fraude chauffeur
   */

  if (driver.fraud_score >= 70) {
    return false;
  }

  /**
   * chauffeur déjà en livraison
   */

  if (driver.current_order_id) {
    return false;
  }

  /**
   * vérification GPS actif
   */

  if (!driver.last_location_update) {
    return false;
  }

  return true;

}

module.exports = {
  canReceiveOrder
};