// service
const repo = require('./dashboard.repository');
const { Parser } = require('json2csv');

exports.getStats = async () => {
  return {
    active: await repo.countByPhase('active'),
    retrying: await repo.countByPhase('retrying'),
    grace: await repo.countByPhase('grace'),
    suspended: await repo.countByPhase('suspended'),
    paused: await repo.countByPhase('paused'),
    cancelled: await repo.countByPhase('cancelled')
  };
};

exports.getSubscriptions = async (phase, startDate, endDate) => {
  return await repo.findSubscriptions(phase, startDate, endDate);
};

exports.searchDriver = async (keyword) => {
  return await repo.searchDriver(keyword);
};

exports.getEvolution = async () => {
  return await repo.getEvolution();
};

exports.exportCSV = async () => {
  const data = await repo.findSubscriptions();
  const parser = new Parser();
  return parser.parse(data);
};