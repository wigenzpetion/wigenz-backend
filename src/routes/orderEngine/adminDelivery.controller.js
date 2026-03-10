// verification administrateur de la livraison
const OrderRepository = require("./orders.repository");
const OrderEngine = require("./order.engine");

class AdminDeliveryController {

  static async approveDelivery(req, res, next) {
    try {

      const orderId = req.params.id;

      const order = await OrderRepository.getById(orderId);

      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }

      if (order.status !== "DELIVERY_PENDING_VERIFICATION") {
        return res.status(400).json({ message: "Order not in review mode" });
      }

      await OrderEngine.changeStatus(
        orderId,
        "DELIVERED",
        req.user
      );

      return res.json({
        message: "Delivery approved manually"
      });

    } catch (error) {
      next(error);
    }
  }

}

module.exports = AdminDeliveryController;