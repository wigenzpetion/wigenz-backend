const eventBus = require("../../core/eventBus");
const NotificationService = require("../notification/notification.service");

eventBus.on("TICKET_OPENED", async (payload) => {
  const { ticket } = payload;
  if (!ticket?.id) return;
  await NotificationService.notifyAdmins(
    "Wigenz – Nouveau ticket support #" + ticket.id,
    "Nouveau ticket : " + (ticket.subject || "Sans objet") + (ticket.order_id ? " (commande #" + ticket.order_id + ")" : "")
  ).catch(() => {});
});

eventBus.on("TICKET_REPLIED", async (payload) => {
  const { ticket, actorRole } = payload;
  if (!ticket?.user_id) return;
  // Réponse du support → notifier le titulaire du ticket
  if (actorRole === "SUPPORT") {
    await NotificationService.notifyClient(
      ticket.user_id,
      "📩 Nouvelle réponse sur votre ticket support : " + (ticket.subject || "Sans objet")
    ).catch(() => {});
  }
});

eventBus.on("TICKET_RESOLVED", async (payload) => {
  const { ticket } = payload;
  if (!ticket?.user_id) return;
  await NotificationService.notifyClient(
    ticket.user_id,
    "✅ Votre ticket support a été résolu : " + (ticket.subject || "Sans objet")
  ).catch(() => {});
});
