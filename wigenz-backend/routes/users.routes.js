const router = require("express").Router();
const usersController = require("../controllers/users.controller");

router.get("/test", usersController.test);

module.exports = router;
