// src/middlewares/driverSubscription.middleware.js

const db = require("../config/db");

module.exports = async function driverSubscriptionGuard(req, res, next) {

  try {
    if (!req.user) {
      return next();
    }

    const role = String(req.user.role || "").toUpperCase();

    if (role !== "DRIVER") {
      return next();
    }

    const result = await db.query(
      `SELECT subscription_status, subscription_end
       FROM drivers
       WHERE id = $1`,
      [req.user.id]
    );

    const driver = result.rows[0];

    if (!driver) {
      return res.status(404).json({ message: "Driver not found" });
    }

    if (
      driver.subscription_status !== "ACTIVE" &&
      new Date(driver.subscription_end) < new Date()
    ) {
      return res.status(403).json({
        message: "Subscription expired"
      });
    }

    next();

  } catch (error) {
    next(error);
  }
};
