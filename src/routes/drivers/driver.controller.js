const AppError = require("../../core/errors");
const DriverService = require("./driver.service");
const DriverRepository = require("./driver.repository");

async function getAllDrivers(req, res, next) {
  try {
    const drivers = await DriverService.getAllDrivers(req.query, req.user);
    res.json(drivers);
  } catch (err) {
    next(err);
  }
}

async function getDriverById(req, res, next) {
  try {
    const driver = await DriverService.getDriverById(req.params.id);
    res.json(driver);
  } catch (err) {
    next(err);
  }
}

async function getMyProfile(req, res, next) {
  try {
    const driver = await DriverRepository.findByUserId(req.user.id);
    if (!driver) {
      throw new AppError("Driver profile not found", 404);
    }
    res.json(driver);
  } catch (err) {
    next(err);
  }
}

async function approveDriver(req, res, next) {
  try {
    const updated = await DriverRepository.update(req.params.id, { status: "ACTIVE" });
    if (!updated) {
      throw new AppError("Driver not found", 404);
    }
    res.json(updated);
  } catch (err) {
    next(err);
  }
}

async function suspendDriver(req, res, next) {
  try {
    const updated = await DriverRepository.update(req.params.id, { status: "SUSPENDED" });
    if (!updated) {
      throw new AppError("Driver not found", 404);
    }
    res.json(updated);
  } catch (err) {
    next(err);
  }
}

async function updateMyProfile(req, res, next) {
  try {
    const current = await DriverRepository.findByUserId(req.user.id);
    if (!current) {
      throw new AppError("Driver profile not found", 404);
    }

    const allowedFields = ["vehicle_type", "vehicle_plate", "license_number"];
    const updateData = Object.fromEntries(
      Object.entries(req.body || {}).filter(
        ([key, value]) => allowedFields.includes(key) && value !== undefined
      )
    );

    if (!Object.keys(updateData).length) {
      throw new AppError("No updatable fields provided", 400);
    }

    const updated = await DriverService.updateDriver(current.id, updateData, req.user);
    res.json(updated);
  } catch (err) {
    next(err);
  }
}

// Legacy names kept for backward compatibility.
async function create(req, res, next) {
  try {
    const driver = await DriverService.createDriver(req.body);
    res.status(201).json(driver);
  } catch (err) {
    next(err);
  }
}

const getById = getDriverById;
const getAll = getAllDrivers;

async function update(req, res, next) {
  try {
    const driver = await DriverService.updateDriver(req.params.id, req.body, req.user);
    res.json(driver);
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    const result = await DriverService.deleteDriver(req.params.id, req.user);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getAllDrivers,
  getDriverById,
  getMyProfile,
  approveDriver,
  suspendDriver,
  updateMyProfile,
  create,
  getById,
  getAll,
  update,
  delete: remove
};
