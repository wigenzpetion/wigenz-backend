const SupportRepository = require("./support.repository");
const AppError = require("../../core/errors");
const eventBus = require("../../core/eventBus");

const PRIVILEGED_ROLES = new Set(["ADMIN", "SUPER_ADMIN"]);
const SUPPORT_CONSOLE_ROLES = new Set(["SUPPORT", "SUPPORT_AGENT", "SUPPORT_ADMIN"]);

class SupportService {
  static normalizeRole(role) {
    return String(role || "").toUpperCase();
  }

  static isPrivilegedRole(role) {
    return PRIVILEGED_ROLES.has(this.normalizeRole(role));
  }

  static isSupportConsoleRole(role) {
    return SUPPORT_CONSOLE_ROLES.has(this.normalizeRole(role));
  }

  static async canAccessTicket(ticket, userId, userRole) {
    if (!ticket || !userId) {
      return false;
    }

    const role = this.normalizeRole(userRole);
    const actorId = Number(userId);
    const ticketOwnerId = Number(ticket.user_id);
    const ticketAssignedTo = ticket.assigned_to ? Number(ticket.assigned_to) : null;

    if (this.isPrivilegedRole(role)) {
      return true;
    }

    if (ticketOwnerId === actorId) {
      return true;
    }

    if (!this.isSupportConsoleRole(role)) {
      return false;
    }

    if (ticketAssignedTo && ticketAssignedTo === actorId) {
      return true;
    }

    if (await SupportRepository.hasActiveAssigneeRelation(ticket.id, actorId)) {
      return true;
    }

    // Triage rule: support admins can inspect unassigned tickets.
    if (!ticketAssignedTo && (role === "SUPPORT_ADMIN" || role === "SUPPORT")) {
      return true;
    }

    if (!ticketAssignedTo) {
      return false;
    }

    if (role === "SUPPORT_ADMIN" || role === "SUPPORT") {
      const isManager = await SupportRepository.hasActiveManagerLink(actorId, ticketAssignedTo);
      if (isManager) {
        return true;
      }

      const sameTeam = await SupportRepository.sharesSupportTeam(actorId, ticketAssignedTo);
      if (sameTeam) {
        return true;
      }
    }

    return false;
  }

  static async createTicket(userId, role, data) {
    const { order_id, subject, message, priority, category } = data;
    if (!subject) throw new AppError("Subject is required", 400);
    const allowedPriority = ["LOW", "MEDIUM", "HIGH"];
    const allowedCategory = ["LIVRAISON", "PAIEMENT", "LITIGE", "AUTRE"];
    if (priority && !allowedPriority.includes(priority)) throw new AppError("Invalid priority", 400);
    if (category && !allowedCategory.includes(category)) throw new AppError("Invalid category", 400);
    const ticket = await SupportRepository.createTicket({
      user_id: userId,
      order_id: order_id || null,
      subject,
      message: message || "",
      author_role: role,
      priority: priority || "MEDIUM",
      category: category || "AUTRE"
    });
    eventBus.emit("TICKET_OPENED", { ticket, actorId: userId, actorRole: role });
    return ticket;
  }

  static async getMyTickets(userId) {
    return SupportRepository.findByUserId(userId);
  }

  static async getTicketById(id, userId, userRole) {
    const ticket = await SupportRepository.findById(id);
    if (!ticket) throw new AppError("Ticket not found", 404);

    const allowed = await this.canAccessTicket(ticket, userId, userRole);
    if (!allowed) {
      throw new AppError("Unauthorized", 403);
    }

    return ticket;
  }

  static async getTicketWithReplies(id, userId, userRole) {
    const ticket = await this.getTicketById(id, userId, userRole);
    const replies = await SupportRepository.getReplies(id);
    const attachments = await SupportRepository.getAttachmentsByTicketId(id);
    return { ...ticket, replies, attachments };
  }

  static async addAttachment(ticketId, userId, userRole, file) {
    if (!file || !file.path) throw new AppError("File is required", 400);
    await this.getTicketById(ticketId, userId, userRole);
    return SupportRepository.addAttachment({
      ticket_id: ticketId,
      reply_id: null,
      file_name: file.originalname || file.filename || "file",
      file_path: file.path,
      uploaded_by: userId
    });
  }

  static async getAttachments(ticketId, userId, userRole) {
    await this.getTicketById(ticketId, userId, userRole);
    return SupportRepository.getAttachmentsByTicketId(ticketId);
  }

  static async addReply(ticketId, userId, userRole, message) {
    if (!message || !message.trim()) throw new AppError("Message is required", 400);
    const ticket = await this.getTicketById(ticketId, userId, userRole);
    const role = this.normalizeRole(userRole);
    const authorType = this.isSupportConsoleRole(role) || this.isPrivilegedRole(role)
      ? "SUPPORT"
      : role;

    const reply = await SupportRepository.addReply({
      ticket_id: ticketId,
      author_id: userId,
      author_type: authorType,
      message: message.trim()
    });
    eventBus.emit("TICKET_REPLIED", {
      ticket,
      reply,
      actorId: userId,
      actorRole: authorType
    });
    return reply;
  }

  static async getAllTickets(filters, actor = null) {
    if (!actor?.id) {
      return SupportRepository.findAll(filters);
    }

    const role = this.normalizeRole(actor.role);

    if (this.isPrivilegedRole(role)) {
      return SupportRepository.findAll(filters);
    }

    if (this.isSupportConsoleRole(role)) {
      const all = await SupportRepository.findAll(filters);
      const checks = await Promise.all(
        all.map((ticket) => this.canAccessTicket(ticket, actor.id, role))
      );
      return all.filter((_, index) => checks[index]);
    }

    return SupportRepository.findByUserId(actor.id);
  }

  static async updateStatus(ticketId, status, actorId, actorRole) {
    const allowed = ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"];
    if (!allowed.includes(status)) throw new AppError("Invalid status", 400);

    const role = this.normalizeRole(actorRole);
    if (!this.isPrivilegedRole(role) && !this.isSupportConsoleRole(role)) {
      throw new AppError("Unauthorized", 403);
    }

    await this.getTicketById(ticketId, actorId, role);

    const ticket = await SupportRepository.updateStatus(
      ticketId,
      status,
      status === "RESOLVED" ? actorId : null
    );

    if (ticket && status === "RESOLVED") {
      eventBus.emit("TICKET_RESOLVED", {
        ticket,
        actorId,
        actorRole: role
      });
    }

    return ticket;
  }

  static async assignTicket(ticketId, assignedTo, actorId, actorRole) {
    const role = this.normalizeRole(actorRole);
    const assignToId = Number(assignedTo);

    if (!assignToId || Number.isNaN(assignToId)) {
      throw new AppError("assigned_to must be a valid user id", 400);
    }

    const ticket = await SupportRepository.findById(ticketId);
    if (!ticket) throw new AppError("Ticket not found", 404);

    if (!this.isPrivilegedRole(role) && !this.isSupportConsoleRole(role)) {
      throw new AppError("Unauthorized", 403);
    }

    const canAccess = await this.canAccessTicket(ticket, actorId, role);
    if (!canAccess) {
      throw new AppError("Unauthorized", 403);
    }

    const eligibleAssignee = await SupportRepository.findSupportEligibleUser(assignToId);
    if (!eligibleAssignee) {
      throw new AppError("Assigned user is not eligible for support tickets", 400);
    }

    // Support agent can only self-assign and cannot reassign tickets owned by others.
    if (role === "SUPPORT_AGENT") {
      if (assignToId !== Number(actorId)) {
        throw new AppError("Support agent can only self-assign", 403);
      }
      if (ticket.assigned_to && Number(ticket.assigned_to) !== Number(actorId)) {
        throw new AppError("Support agent cannot reassign another assignee ticket", 403);
      }
    }

    return SupportRepository.assign(ticketId, assignToId);
  }
}

module.exports = SupportService;
