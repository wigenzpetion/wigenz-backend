const express = require("express");
const router = express.Router();

const DispatchController = require("./dispatch.controller");
const authMiddleware = require("../../middlewares/auth");
const roleMiddleware = require("../../middlewares/role.middleware");
const driverSubscriptionMiddleware = require("../../middlewares/driverSubscription.middleware");

router.use(authMiddleware);
router.use(roleMiddleware(["DRIVER"]));
router.use(driverSubscriptionMiddleware);

router.post(
  "/location",
  DispatchController.updateLocation
);

module.exports = router;
