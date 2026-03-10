// src/middlewares/role.middleware.js

module.exports = function roleMiddleware(allowedRoles = []) {

  return (req, res, next) => {
    if (!req.user) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const userRole = String(req.user.role || "").toUpperCase();
    const normalizedAllowed = allowedRoles.map((r) => String(r).toUpperCase());

    if (!normalizedAllowed.includes(userRole)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    next();
  };
};
