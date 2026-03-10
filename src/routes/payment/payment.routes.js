const express = require("express");
const router = express.Router();

const PaymentController = require("./payment.controller");
const authMiddleware = require("../../middlewares/auth");

// Toutes les routes nécessitent auth
router.use(authMiddleware);

/**
 * CLIENT
 */
router.post("/", PaymentController.create);
router.get("/me", PaymentController.getMine);

/**
 * ADMIN / SUPER_ADMIN
 */
router.get("/", PaymentController.getAll);
router.patch("/:id/status", PaymentController.updateStatus);

/**
 * Accessible selon règles RBAC dans service
 */
router.get("/:id", PaymentController.getById);

module.exports = router;