const adminRepository = require('./admin.repository');

exports.getDashboardData = async () => {
  return await adminRepository.getDashboardStats();
};

exports.getAllUsers = async () => {
  return await adminRepository.fetchAllUsers();
};

exports.deleteUser = async (userId, adminId) => {

  if (!userId) throw new Error("User ID required");

  await adminRepository.deleteUserById(userId);

  await adminRepository.logAdminAction({
    adminId,
    action: 'DELETE_USER',
    targetId: userId
  });
};

exports.suspendDriver = async (driverId, adminId) => {

  await adminRepository.updateDriverStatus(driverId, 'suspended');

  await adminRepository.logAdminAction({
    adminId,
    action: 'SUSPEND_DRIVER',
    targetId: driverId
  });
};