module.exports = (err, req, res, next) => {
  console.error(err.stack);
  const statusCode = err.statusCode || 500;
  const message = statusCode === 500 ? "Internal Server Error" : (err.message || "Error");
  res.status(statusCode).json({ error: message });
};