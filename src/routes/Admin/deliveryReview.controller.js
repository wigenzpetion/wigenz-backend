const OperationsController = require("./operations.controller");

module.exports = {
  approve: (req, res, next) => OperationsController.approveDelivery(req, res, next),
  reject: (req, res, next) => OperationsController.rejectDelivery(req, res, next)
};