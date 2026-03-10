// Administration des itinéraires
const express = require('express');
const router = express.Router();

const auth = require('../../../middlewares/auth.middleware');
const role = require('../../../middlewares/role.middleware');
const controller = require('./dashboard.controller');

router.use(auth);
router.use(role(['admin']));

// 📊 Statistiques globales
router.get('/stats', controller.getStats);

// 📋 Liste filtrable
router.get('/subscriptions', controller.getSubscriptions);

// 🔍 Recherche chauffeur
router.get('/search', controller.searchDriver);

// 📈 Evolution graphique
router.get('/evolution', controller.getEvolution);

// 📤 Export CSV
router.get('/export', controller.exportCSV);

module.exports = router;