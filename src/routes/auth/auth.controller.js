const AuthService = require("./auth.service");

class AuthController {

  static async register(req, res, next) {
    try {
      const result = await AuthService.register(req.body);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }

  static async login(req, res, next) {
    try {
      const result = await AuthService.login(
        req.body.email,
        req.body.password
      );
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = AuthController;