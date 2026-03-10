module.exports = {
  PORT: process.env.PORT || "3000",
  CORS_ORIGIN: process.env.CORS_ORIGIN || "http://localhost:3001",
  DB_HOST: process.env.DB_HOST || "localhost",
  DB_PORT: process.env.DB_PORT || "5432",
  DB_USER: process.env.DB_USER || "postgres",
  DB_NAME: process.env.DB_NAME || "wigenz_db",
  JWT_SECRET: process.env.JWT_SECRET || "",
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || ""
};
