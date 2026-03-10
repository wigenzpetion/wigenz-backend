const PayoutRepository = require("./payout.repository");
const { ensureTeamAccess } = require("../../rbac/team-access.service");

class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
  }
}

function normalizeRole(user) {
  return String(user?.role || "").toUpperCase();
}

class PayoutService {
  static async requestPayout(data, currentUser) {
    const role = normalizeRole(currentUser);
    if (role !== "DRIVER") {
      throw new AppError("Only driver can request payout", 403);
    }

    const amount = Number(data?.amount);
    if (!amount || Number.isNaN(amount) || amount <= 0) {
      throw new AppError("Invalid amount", 400);
    }

    if (!data?.payment_method) {
      throw new AppError("Payment method is required", 400);
    }

    return PayoutRepository.create({
      driver_id: currentUser.id,
      amount,
      payment_method: data.payment_method,
      order_id: data.order_id || null
    });
  }

  static async getMyPayouts(currentUser) {
    const role = normalizeRole(currentUser);
    if (role !== "DRIVER") {
      throw new AppError("Only driver can view own payouts", 403);
    }

    return PayoutRepository.findByDriver(currentUser.id);
  }

  static async getAllPayouts(pagination, currentUser) {
    const role = normalizeRole(currentUser);
    if (role !== "ADMIN" && role !== "SUPER_ADMIN" && role !== "FINANCE_ADMIN") {
      throw new AppError("Unauthorized", 403);
    }

    await ensureTeamAccess(currentUser, {
      teamCode: "FINANCE",
      enforcedRoles: ["FINANCE_ADMIN"],
      privilegedRoles: ["SUPER_ADMIN", "ADMIN"]
    });

    return PayoutRepository.findAll(pagination || {});
  }

  static async updateStatus(id, status, currentUser) {
    const role = normalizeRole(currentUser);
    if (role !== "ADMIN" && role !== "SUPER_ADMIN" && role !== "FINANCE_ADMIN") {
      throw new AppError("Unauthorized", 403);
    }

    await ensureTeamAccess(currentUser, {
      teamCode: "FINANCE",
      enforcedRoles: ["FINANCE_ADMIN"],
      privilegedRoles: ["SUPER_ADMIN", "ADMIN"]
    });

    const normalizedStatus = String(status || "").toUpperCase();
    const allowed = ["PENDING", "APPROVED", "REJECTED", "PAID"];
    if (!allowed.includes(normalizedStatus)) {
      throw new AppError("Invalid payout status", 400);
    }

    return PayoutRepository.updateStatus(id, normalizedStatus);
  }

  static async process() {
    const payouts = await PayoutRepository.findEligibleForProcessing();

    for (const payout of payouts) {
      await PayoutRepository.markProcessing(payout.id);
      await PayoutRepository.markPaid(payout.id);
    }

    return payouts.length;
  }
}

module.exports = PayoutService;
