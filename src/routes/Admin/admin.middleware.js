const AppError = require("../../core/errors");

module.exports = function adminOnly(req, res, next) {
  if (
    req.user.role !== "ADMIN" &&
    req.user.role !== "SUPER_ADMIN"
  ) {
    throw new AppError("Admin access required", 403);
  }
  next();
};