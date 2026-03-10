// src/middlewares/withdrawalGuard.middleware.js

const db = require("../config/db");

module.exports = async function withdrawalGuard(req, res, next) {

  try {

    const result = await db.query(
      `SELECT fraud_score, status
       FROM drivers
       WHERE id = $1`,
      [req.user.id]
    );

    const driver = result.rows[0];

    if (!driver) {
      return res.status(404).json({ message: "Driver not found" });
    }

    if (driver.status === "SUSPENDED") {
      return res.status(403).json({
        message: "Driver suspended"
      });
    }

    if (driver.fraud_score >= 70) {
      return res.status(403).json({
        message: "Withdrawal blocked due to risk"
      });
    }

    next();

  } catch (error) {
    next(error);
  }
};