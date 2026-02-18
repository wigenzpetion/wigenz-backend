const router = require("express").Router();
const authController = require("../controllers/auth.controller");

router.get("/test", authController.test);

module.exports = router;
