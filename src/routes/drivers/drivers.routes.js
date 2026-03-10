const express = require("express");
const router = express.Router();

const auth = require("../../middlewares/auth.middleware");
const role = require("../../middlewares/role.middleware");
const driverSubscriptionMiddleware = require("../../middlewares/driverSubscription.middleware");

const controller = require("../../controllers/driver.controller");

router.use(auth);
router.use(driverSubscriptionMiddleware);

// Admin only
router.get("/", role(["admin"]), controller.getAllDrivers);

// Driver only - own profile
router.get("/profile/me", role(["driver"]), controller.getMyProfile);
router.put("/profile/me", role(["driver"]), controller.updateMyProfile);

// Admin actions
router.put("/:id/approve", role(["admin"]), controller.approveDriver);
router.put("/:id/suspend", role(["admin"]), controller.suspendDriver);

// Admin + Support
router.get("/:id", role(["admin", "support"]), controller.getDriverById);

module.exports = router;
