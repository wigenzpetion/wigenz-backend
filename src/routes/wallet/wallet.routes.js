const express = require('express');
const router = express.Router();
const walletController = require('../../controllers/wallet.controller');
const auth = require('../../middlewares/auth.middleware');
const withdrawalGuard = require('../../middlewares/withdrawalGuard.middleware');

router.post('/debit', auth, walletController.debit);
router.post('/withdraw', auth, withdrawalGuard, walletController.withdraw);

module.exports = router;
