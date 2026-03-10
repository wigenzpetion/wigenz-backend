const adminService = require('./admin.service');

exports.getDashboard = async (req, res, next) => {
  try {
    const data = await adminService.getDashboardData();
    res.json(data);
  } catch (err) {
    next(err);
  }
};

exports.getAllUsers = async (req, res, next) => {
  try {
    const users = await adminService.getAllUsers();
    res.json(users);
  } catch (err) {
    next(err);
  }
};

exports.deleteUser = async (req, res, next) => {
  try {
    const id = req.params.id;
    await adminService.deleteUser(id, req.user.id);
    res.json({ message: "User deleted" });
  } catch (err) {
    next(err);
  }
};

exports.suspendDriver = async (req, res, next) => {
  try {
    const id = req.params.id;
    await adminService.suspendDriver(id, req.user.id);
    res.json({ message: "Driver suspended" });
  } catch (err) {
    next(err);
  }
};