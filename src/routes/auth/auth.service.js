const AuthRepository = require("./auth.repository");
const PasswordService = require("./password.service");
const TokenService = require("./token.service");

class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
  }
}

class AuthService {

  static async register(data) {

    const existing = await AuthRepository.findByEmail(data.email);
    if (existing) throw new AppError("Email already used", 400);

    const hashed = await PasswordService.hash(data.password);

    const user = await AuthRepository.create({
      name: data.name,
      email: data.email,
      password: hashed,
      role: "CLIENT"
    });

    const accessToken = TokenService.generateAccessToken({
      id: user.id,
      role: user.role
    });

    const refreshToken = TokenService.generateRefreshToken({
      id: user.id
    });

    return { user, accessToken, refreshToken };
  }

  static async login(email, password) {

    const user = await AuthRepository.findByEmail(email);
    if (!user) throw new AppError("Invalid credentials", 401);

    const match = await PasswordService.compare(password, user.password);
    if (!match) throw new AppError("Invalid credentials", 401);

    const accessToken = TokenService.generateAccessToken({
      id: user.id,
      role: user.role
    });

    const refreshToken = TokenService.generateRefreshToken({
      id: user.id
    });

    return { user, accessToken, refreshToken };
  }
}

module.exports = AuthService;