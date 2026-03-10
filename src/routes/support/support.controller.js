const SupportService = require("./support.service");

class SupportController {

  static async create(req, res, next) {
    try {
      const ticket = await SupportService.createTicket(
        req.user.id,
        req.user.role,
        req.body
      );
      res.status(201).json(ticket);
    } catch (err) {
      next(err);
    }
  }

  static async myTickets(req, res, next) {
    try {
      const tickets = await SupportService.getMyTickets(req.user.id);
      res.json(tickets);
    } catch (err) {
      next(err);
    }
  }

  static async getById(req, res, next) {
    try {
      const ticket = await SupportService.getTicketWithReplies(
        req.params.id,
        req.user.id,
        req.user.role
      );
      res.json(ticket);
    } catch (err) {
      next(err);
    }
  }

  static async addReply(req, res, next) {
    try {
      const reply = await SupportService.addReply(
        req.params.id,
        req.user.id,
        req.user.role,
        req.body.message
      );
      res.status(201).json(reply);
    } catch (err) {
      next(err);
    }
  }

  static async addAttachment(req, res, next) {
    try {
      const attachment = await SupportService.addAttachment(
        req.params.id,
        req.user.id,
        req.user.role,
        req.file
      );
      res.status(201).json(attachment);
    } catch (err) {
      next(err);
    }
  }

  static async getAttachments(req, res, next) {
    try {
      const attachments = await SupportService.getAttachments(
        req.params.id,
        req.user.id,
        req.user.role
      );
      res.json(attachments);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = SupportController;
