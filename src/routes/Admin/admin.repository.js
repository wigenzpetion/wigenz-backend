const db = require('../../config/db');

exports.fetchAllUsers = async () => {
  const result = await db.query('SELECT id, email, role FROM users');
  return result.rows;
};

exports.deleteUserById = async (id) => {
  await db.query('DELETE FROM users WHERE id = $1', [id]);
};

exports.updateDriverStatus = async (id, status) => {
  await db.query(
    'UPDATE drivers SET status = $1 WHERE id = $2',
    [status, id]
  );
};

exports.getDashboardStats = async () => {

  const users = await db.query('SELECT COUNT(*) FROM users');
  const drivers = await db.query('SELECT COUNT(*) FROM drivers');
  const revenue = await db.query('SELECT SUM(amount) FROM transactions');

  return {
    totalUsers: users.rows[0].count,
    totalDrivers: drivers.rows[0].count,
    totalRevenue: revenue.rows[0].sum
  };
};

exports.logAdminAction = async ({ adminId, action, targetId }) => {
  await db.query(
    'INSERT INTO admin_logs (admin_id, action, target_id) VALUES ($1,$2,$3)',
    [adminId, action, targetId]
  );
};
