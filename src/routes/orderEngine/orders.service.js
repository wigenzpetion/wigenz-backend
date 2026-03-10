const eventBus = require("../../core/eventBus");
const OrderRepository = require("./orders.repository");

async function createOrder(data) {
  const order = await OrderRepository.create(data);

  eventBus.emit("ORDER_CREATED", order);

  return order;
}

module.exports = { createOrder };