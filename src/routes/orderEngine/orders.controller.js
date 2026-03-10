// securiser contre chaffeur malhonete
const OrderEngine = require("./order.engine");

class OrdersController {

  static async pickUp(req, res, next) {
    try {
      const order = await OrderEngine.changeStatus(
        req.params.id,
        "PICKED_UP",
        req.user
      );
      res.json(order);
    } catch (err) {
      next(err);
    }
  }

  static async inTransit(req, res, next) {
    try {
      const order = await OrderEngine.changeStatus(
        req.params.id,
        "IN_TRANSIT",
        req.user
      );
      res.json(order);
    } catch (err) {
      next(err);
    }
  }

  static async requestDeliveryValidation(req, res, next) {
    try {
      const order = await OrderEngine.changeStatus(
        req.params.id,
        "DELIVERY_PENDING_VERIFICATION",
        req.user
      );
      res.json(order);
    } catch (err) {
      next(err);
    }
  }

}

module.exports = OrdersController;