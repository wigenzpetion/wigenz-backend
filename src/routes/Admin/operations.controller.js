const DriverRepository = require("../drivers/driver.repository");
const logger = require("../../utils/log-system");
const OrderEngine = require("../orderEngine/order.engine");
const db = require("../../config/db");

class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
  }
}

class OperationsController {
  static authorize(user) {
    const role = String(user?.role || "").toUpperCase();
    const allowed = new Set([
      "ADMIN",
      "SUPER_ADMIN",
      "OPERATIONS_ADMIN",
      "RISK_ADMIN",
      "SUPPORT_ADMIN",
      "FINANCE_ADMIN",
      "TECH_ADMIN",
      "HR_ADMIN"
    ]);

    if (!allowed.has(role)) {
      throw new AppError("Unauthorized access", 403);
    }
  }

  static async getAllDrivers(req, res, next) {
    try {
      const drivers = await DriverRepository.findAll(req.query || {});
      res.json({ total: drivers.length, drivers });
    } catch (err) {
      next(err);
    }
  }

  static async updateDriverStatus(req, res, next) {
    try {
      const { status } = req.body;

      if (!["ACTIVE", "SUSPENDED", "PENDING"].includes(status)) {
        throw new AppError("Invalid status value", 400);
      }

      const updatedDriver = await DriverRepository.update(req.params.id, { status });

      logger.info("Driver status updated", {
        adminId: req.user.id,
        driverId: req.params.id,
        newStatus: status
      });

      res.json(updatedDriver);
    } catch (err) {
      next(err);
    }
  }

  static async getAllOrders(req, res, next) {
    try {
      res.json({ message: "Orders module not connected yet" });
    } catch (err) {
      next(err);
    }
  }

  static async metrics(req, res, next) {
    try {
      const drivers = await DriverRepository.findAll({});

      const active = drivers.filter((d) => d.status === "ACTIVE").length;
      const suspended = drivers.filter((d) => d.status === "SUSPENDED").length;
      const pending = drivers.filter((d) => d.status === "PENDING").length;

      res.json({
        totalDrivers: drivers.length,
        activeDrivers: active,
        suspendedDrivers: suspended,
        pendingDrivers: pending
      });
    } catch (err) {
      next(err);
    }
  }

  static async approveDelivery(req, res, next) {
    try {
      await OrderEngine.changeStatus(req.params.orderId || req.params.id, "DELIVERED", req.user);
      res.json({ message: "Delivery approved successfully" });
    } catch (error) {
      next(error);
    }
  }

  static async rejectDelivery(req, res, next) {
    try {
      await OrderEngine.changeStatus(req.params.orderId || req.params.id, "CANCELLED", req.user);
      res.json({ message: "Delivery rejected and cancelled" });
    } catch (error) {
      next(error);
    }
  }

  static async suspendDriver(req, res, next) {
    try {
      await db.query(
        `UPDATE drivers
         SET status = 'SUSPENDED'
         WHERE id = $1`,
        [req.params.driverId || req.params.id]
      );
      res.json({ message: "Driver suspended" });
    } catch (error) {
      next(error);
    }
  }

  static async activateDriver(req, res, next) {
    try {
      await db.query(
        `UPDATE drivers
         SET status = 'ACTIVE'
         WHERE id = $1`,
        [req.params.driverId || req.params.id]
      );
      res.json({ message: "Driver activated" });
    } catch (error) {
      next(error);
    }
  }

  static async allDrivers(req, res, next) {
    return this.getAllDrivers(req, res, next);
  }

  static async allOrders(req, res, next) {
    return this.getAllOrders(req, res, next);
  }
}

module.exports = OperationsController;
