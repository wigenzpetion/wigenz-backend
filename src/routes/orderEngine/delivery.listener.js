const eventBus = require("../../core/eventBus");
const FraudScoreService = require("../fraud/fraudScore.service");

// Recompute driver fraud score after confirmed delivery events.
eventBus.on("ORDER_DELIVERED", async (order) => {
  try {
    if (!order?.driver_id) {
      return;
    }

    await FraudScoreService.updateDriverScore(order.driver_id);
  } catch (error) {
    console.error("ORDER_DELIVERED fraud scoring failed:", error.message);
  }
});
