const SupportService = require("../routes/support/support.service");

module.exports = {
  async getAllTickets(req, res, next) {
    try {
      const { status, priority, category } = req.query;
      const tickets = await SupportService.getAllTickets({
        status,
        priority,
        category
      }, req.user);
      res.json(tickets);
    } catch (err) {
      next(err);
    }
  }
};
