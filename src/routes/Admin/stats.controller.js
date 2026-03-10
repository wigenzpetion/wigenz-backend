const StatService = require("./stat");

module.exports = {
  async fraudOverview(req, res, next) {
    try {
      const dashboard = await StatService.globalDashboard();
      res.json(dashboard);
    } catch (err) {
      next(err);
    }
  }
};