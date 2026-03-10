const express = require("express");
const router = express.Router();

const authMiddleware = require("../../middlewares/auth");
const roleMiddleware = require("../../middlewares/role.middleware");
const CancelDeliveryService = require("./annulation-delivery");
const { createOrder } = require("../orderEngine/orders.service");

router.use(authMiddleware);

/**
 * Create order
 * POST /api/client-orders
 * CLIENT only
 */
router.post("/", roleMiddleware(["CLIENT"]), async (req, res, next) => {
  try {
    const order = await createOrder({
      ...req.body,
      user_id: req.user.id
    });
    res.status(201).json(order);
  } catch (err) {
    next(err);
  }
});

/**
 * Cancel delivery
 * CLIENT can cancel own order
 * ADMIN / SUPER_ADMIN can cancel any order
 */
router.patch("/:id/cancel", async (req, res, next) => {
  try {
    const result = await CancelDeliveryService.cancel(
      req.params.id,
      req.user
    );
    res.json(result);
  } catch (err) {
    next(err);
  }
});

module.exports = router;