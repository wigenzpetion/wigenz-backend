// exécuter une tâche automatiquement à une heure précise, On l’utilise pour vérifier chaque jour si un abonnement est expiré.
const cron = require("node-cron");
const DriverSubscriptionService = require("../modules/driver/driverSubscription");
const logger = require("../utils/log-system");

/**
 * Daily subscription check
 * Runs every day at midnight
 */
cron.schedule("0 0 * * *", async () => {
  try {
    logger.info("Running daily subscription expiration check...");
    await DriverSubscriptionService.markExpiredSubscriptions();
  } catch (error) {
    logger.error("Subscription cron failed", {
      error: error.message
    });
  }
});