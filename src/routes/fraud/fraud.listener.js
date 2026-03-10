const eventBus = require("../../core/eventBus");
const FraudScoreService = require("./fraudScore.service");

// Fraud score is more meaningful after delivery outcomes.
eventBus.on("ORDER_DELIVERED", async (order) => {
  try {
    if (!order?.driver_id) {
      return;
    }

    await FraudScoreService.updateDriverScore(order.driver_id);
  } catch (error) {
    console.error("ORDER_DELIVERED fraud listener failed:", error.message);
  }
});
