const InvoiceService = require("../../invoice/invoice.service");

async function createSubscriptionInvoice(driver, subscriptionPrice) {
  if (!driver || !driver.user_id || !driver.id) {
    throw new Error("Invalid driver data");
  }

  const amount = Number(subscriptionPrice);
  if (!amount || Number.isNaN(amount) || amount <= 0) {
    throw new Error("Invalid subscription price");
  }

  return InvoiceService.generateInvoice({
    userId: driver.user_id,
    relatedId: driver.id,
    type: "SUBSCRIPTION",
    description: "Driver Subscription Payment",
    amount,
    currency: "USD"
  });
}

module.exports = {
  createSubscriptionInvoice
};
