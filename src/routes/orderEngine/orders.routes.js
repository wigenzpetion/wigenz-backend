// securiser contre chauffeur malhonete
const express = require("express");
const router = express.Router();

const OrdersController = require("./orders.controller");
const authMiddleware = require("../../middlewares/auth.middleware");
const roleMiddleware = require("../../middlewares/role.middleware");

router.use(authMiddleware);

router.patch(
  "/:id/pickup",
  roleMiddleware(["DRIVER"]),
  OrdersController.pickUp
);

router.patch(
  "/:id/in-transit",
  roleMiddleware(["DRIVER"]),
  OrdersController.inTransit
);

router.patch(
  "/:id/delivery-pending",
  roleMiddleware(["DRIVER"]),
  OrdersController.requestDeliveryValidation
);

module.exports = router;