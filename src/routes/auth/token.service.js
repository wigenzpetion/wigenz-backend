const jwt = require("jsonwebtoken");

class TokenService {

  static generateAccessToken(payload) {
    return jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );
  }

  static generateRefreshToken(payload) {
    return jwt.sign(
      payload,
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: "7d" }
    );
  }

  static verify(token) {
    return jwt.verify(token, process.env.JWT_SECRET);
  }
}

module.exports = TokenService;