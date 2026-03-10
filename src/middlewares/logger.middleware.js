// src/middlewares/logger.middleware.js

module.exports = function loggerMiddleware(req, res, next) {

  console.log(
    `[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`
  );

  next();
};