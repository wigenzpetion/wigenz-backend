const eventBus = require("../../core/eventBus");
const NotificationService = require("./notification.service");

async function safeNotify(run) {
  try {
    await run();
  } catch (error) {
    console.warn("Notification listener warning:", error.message);
  }
}

eventBus.on("ORDER_CREATED", async (order) => {
  await safeNotify(() => NotificationService.notifyClient(
    order.user_id,
    "Votre commande a ete creee. Recherche de chauffeur en cours."
  ));
});

eventBus.on("ORDER_PICKED_UP", async (order) => {
  await safeNotify(() => NotificationService.notifyClient(
    order.user_id,
    "Votre colis a ete ramasse."
  ));
});

eventBus.on("ORDER_IN_TRANSIT", async (order) => {
  await safeNotify(() => NotificationService.notifyClient(
    order.user_id,
    "Votre colis est en route."
  ));
});

eventBus.on("ORDER_DELIVERY_PENDING_VERIFICATION", async (order) => {
  await safeNotify(() => NotificationService.notifyClient(
    order.user_id,
    "Validation de la livraison en cours."
  ));
});

eventBus.on("ORDER_DELIVERED", async (order) => {
  await safeNotify(() => NotificationService.notifyClient(
    order.user_id,
    "Votre colis a ete livre."
  ));
});
