const OperationsController = require("./operations.controller");

module.exports = {
  suspendDriver: (req, res, next) => OperationsController.suspendDriver(req, res, next),
  activateDriver: (req, res, next) => OperationsController.activateDriver(req, res, next)
};