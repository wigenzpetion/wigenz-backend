const eventBus = require("../../core/eventBus");
const PaymentService = require("./payment.service");

// On delivery completion, queue payout for the assigned driver.
eventBus.on("ORDER_DELIVERED", async (order) => {
  try {
    if (!order || order.status !== "DELIVERED") {
      return;
    }

    await PaymentService.scheduleDriverPayout(order);
  } catch (error) {
    console.error("ORDER_DELIVERED payout scheduling failed:", error.message);
  }
});
