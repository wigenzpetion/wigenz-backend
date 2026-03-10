const walletService = require('../routes/wallet/wallet.service');

exports.debit = async (req, res, next) => {
  try {
    const { userId: requestedUserId, amount } = req.body;
    const role = String(req.user?.role || '').toUpperCase();
    const canOverrideUser = role === 'ADMIN' || role === 'SUPER_ADMIN';
    const userId = canOverrideUser && requestedUserId
      ? requestedUserId
      : req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    await walletService.debit(userId, amount);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};

exports.withdraw = async (req, res, next) => {
  try {
    const { amount } = req.body;
    const userId = req.user?.id;
    await walletService.withdraw(userId, amount);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};
