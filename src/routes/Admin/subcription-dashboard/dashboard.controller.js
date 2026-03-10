// mTABLEAU DE BORD DES ABONNEMENTS
const service = require('./dashboard.service');

exports.getStats = async (req, res) => {
  const data = await service.getStats();
  res.json(data);
};

exports.getSubscriptions = async (req, res) => {
  const { phase, startDate, endDate } = req.query;
  const data = await service.getSubscriptions(phase, startDate, endDate);
  res.json(data);
};

exports.searchDriver = async (req, res) => {
  const { keyword } = req.query;
  const data = await service.searchDriver(keyword);
  res.json(data);
};

exports.getEvolution = async (req, res) => {
  const data = await service.getEvolution();
  res.json(data);
};

exports.exportCSV = async (req, res) => {
  const csv = await service.exportCSV();
  res.header('Content-Type', 'text/csv');
  res.attachment('subscriptions.csv');
  res.send(csv);
};
