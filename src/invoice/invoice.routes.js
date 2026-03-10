const express = require("express");
const router = express.Router();
const InvoiceController = require("./invoice.controller");
const authMiddleware = require("../../middlewares/auth");

router.use(authMiddleware);

router.post("/", InvoiceController.create);

module.exports = router;