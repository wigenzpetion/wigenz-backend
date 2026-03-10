const DriverRepository = require("./driver.repository");

class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
  }
}

class DriverService {

  static async createDriver(data) {

    const existing = await DriverRepository.findByUserId(data.user_id);

    if (existing) {
      throw new AppError("Driver profile already exists", 400);
    }

    return DriverRepository.create(data);
  }

  static async getDriverById(id) {
    const driver = await DriverRepository.findById(id);

    if (!driver) {
      throw new AppError("Driver not found", 404);
    }

    return driver;
  }

  static async getAllDrivers(pagination, currentUser) {

    if (
      currentUser.role !== "ADMIN" &&
      currentUser.role !== "SUPER_ADMIN"
    ) {
      throw new AppError("Unauthorized", 403);
    }

    return DriverRepository.findAll(pagination);
  }

  static async updateDriver(id, data, currentUser) {

    const driver = await DriverRepository.findById(id);
    if (!driver) throw new AppError("Driver not found", 404);

    // DRIVER peut modifier son propre profil
    if (
      currentUser.role === "DRIVER" &&
      driver.user_id !== currentUser.id
    ) {
      throw new AppError("Unauthorized", 403);
    }

    return DriverRepository.update(id, data);
  }

  static async deleteDriver(id, currentUser) {

    if (
      currentUser.role !== "SUPER_ADMIN"
    ) {
      throw new AppError("Only Super Admin can delete driver", 403);
    }

    const driver = await DriverRepository.findById(id);
    if (!driver) throw new AppError("Driver not found", 404);

    return DriverRepository.delete(id);
  }
}

module.exports = DriverService;