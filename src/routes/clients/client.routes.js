const express = require("express");
const router = express.Router();

const auth = require("../../middlewares/auth.middleware");
const role = require("../../middlewares/role.middleware");

const controller = require("./client.controller");

// Admin - all users
router.get("/", auth, role(["admin"]), controller.getAllUsers);

// Authenticated user - own profile
router.get("/profile/me", auth, controller.getMyProfile);
router.put("/profile/me", auth, controller.updateMyProfile);

// Admin - user management
router.put("/:id/role", auth, role(["admin"]), controller.updateUserRole);
router.put("/:id/suspend", auth, role(["admin"]), controller.suspendUser);
router.delete("/:id", auth, role(["admin"]), controller.deleteUser);

// Admin + Support - single user lookup
router.get("/:id", auth, role(["admin", "support"]), controller.getUserById);

module.exports = router;
