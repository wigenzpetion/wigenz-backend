const express = require('express');
const router = express.Router();

const auth = require('../middlewares/auth.middleware');
const role = require('../middlewares/role.middleware');

const ticketController = require('../controllers/ticket.controller');

// Admin + Support
router.get(
  '/',
  auth,
  role(['admin','support']),
  ticketController.getAllTickets
);

module.exports = router;