const db = require("../../config/db");
const SupportService = require("../support/support.service");

class SupportController {
  /** Legacy: disputes table */
  static async allTickets(req, res, next) {
    try {
      const tickets = await SupportService.getAllTickets({}, req.user);
      res.json(tickets);
    } catch (error) {
      next(error);
    }
  }

  /** New: support_tickets via SupportService */
  static async listTickets(req, res, next) {
    try {
      const { status, priority, category } = req.query;
      const tickets = await SupportService.getAllTickets(
        { status, priority, category },
        req.user
      );
      res.json(tickets);
    } catch (error) {
      next(error);
    }
  }

  static async getTicket(req, res, next) {
    try {
      const ticket = await SupportService.getTicketWithReplies(
        req.params.id,
        req.user.id,
        req.user.role
      );
      res.json(ticket);
    } catch (error) {
      next(error);
    }
  }

  static async resolveTicket(req, res, next) {
    try {
      const id = req.params.id || req.params.disputeId;
      const isNumeric = /^\d+$/.test(String(id));
      if (isNumeric) {
        const ticket = await SupportService.updateStatus(
          id,
          "RESOLVED",
          req.user.id,
          req.user.role
        );
        return res.json(ticket || { message: "Ticket resolved" });
      }
      await db.query(
        `UPDATE disputes SET status = 'RESOLVED', resolved_at = NOW() WHERE id = $1`,
        [id]
      );
      res.json({ message: "Dispute resolved" });
    } catch (error) {
      next(error);
    }
  }

  static async updateStatus(req, res, next) {
    try {
      const ticket = await SupportService.updateStatus(
        req.params.id,
        req.body.status,
        req.user.id,
        req.user.role
      );
      res.json(ticket);
    } catch (error) {
      next(error);
    }
  }

  static async assignTicket(req, res, next) {
    try {
      const ticket = await SupportService.assignTicket(
        req.params.id,
        req.body.assigned_to,
        req.user.id,
        req.user.role
      );
      res.json(ticket);
    } catch (error) {
      next(error);
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
    } catch (error) {
      next(error);
    }
  }

  static async getDisputes(req, res, next) {
    return this.allTickets(req, res, next);
  }

  static async resolveDispute(req, res, next) {
    return this.resolveTicket(req, res, next);
  }
}

module.exports = SupportController;
