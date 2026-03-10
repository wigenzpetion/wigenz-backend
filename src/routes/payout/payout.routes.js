const express = require("express");
const router = express.Router();

const PayoutController = require("./payout.controller");
const authMiddleware = require("../../middlewares/auth");

router.use(authMiddleware);

// DRIVER
router.post("/", PayoutController.request);
router.get("/me", PayoutController.getMine);

// ADMIN / SUPER_ADMIN
router.get("/", PayoutController.getAll);
router.patch("/:id/status", PayoutController.updateStatus);

module.exports = router;