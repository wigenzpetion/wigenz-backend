const express = require("express");
const router = express.Router();

const authMiddleware = require("../../middlewares/auth");
const roleMiddleware = require("../../middlewares/role.middleware");
const { requirePermission } = require("../../rbac/permission.middleware");
const { requireTeamMembership } = require("../../rbac/relation.middleware");

const financeController = require("./finance.controller");
const operationsController = require("./operations.controller");
const riskController = require("./risk.controller");
const supportController = require("./support.controller");
const DeliveryReviewController = require("./deliveryReview.controller");
const DriverManagementController = require("./driverManagement.controller");
const PayoutController = require("./payout.controller");
const StatsController = require("./stats.controller");
const AuditController = require("./audit.controller");

const supportConsoleRole = roleMiddleware([
  "SUPER_ADMIN",
  "ADMIN",
  "SUPPORT",
  "SUPPORT_AGENT",
  "SUPPORT_ADMIN"
]);

const financeConsoleRelation = requireTeamMembership("FINANCE", {
  enforcedRoles: ["FINANCE_ADMIN"],
  privilegedRoles: ["SUPER_ADMIN", "ADMIN"]
});

router.use(authMiddleware);

router.get(
  "/finance/overview",
  requirePermission("payments.view", { scopes: ["global"] }),
  financeConsoleRelation,
  financeController.overview
);
router.get(
  "/finance/payments",
  requirePermission("payments.view", { scopes: ["global"] }),
  financeConsoleRelation,
  financeController.allPayments
);
router.get(
  "/finance/payouts",
  requirePermission("payouts.view", { scopes: ["global"] }),
  financeConsoleRelation,
  financeController.allPayouts
);
router.post(
  "/finance/payout/process",
  requirePermission("payouts.approve", { scopes: ["global"] }),
  financeConsoleRelation,
  financeController.processPayouts
);
router.get(
  "/finance/payout/pending",
  requirePermission("payouts.view", { scopes: ["global"] }),
  financeConsoleRelation,
  financeController.pendingPayouts
);
router.post(
  "/finance/refund/:paymentId",
  requirePermission("payments.refund", { scopes: ["global"] }),
  financeConsoleRelation,
  financeController.refundPayment
);

router.get(
  "/operations/drivers",
  requirePermission("drivers.view", { scopes: ["region", "global"] }),
  operationsController.getAllDrivers
);
router.get(
  "/operations/orders",
  requirePermission("orders.view", { scopes: ["region", "global"] }),
  operationsController.getAllOrders
);
router.patch(
  "/operations/driver/:id/status",
  requirePermission("drivers.suspend", { scopes: ["region", "global"] }),
  operationsController.updateDriverStatus
);

router.get(
  "/risk/flagged-payments",
  requirePermission("risk.view", { scopes: ["global"] }),
  riskController.flaggedPayments
);
router.get(
  "/risk/suspended-drivers",
  requirePermission("risk.view", { scopes: ["global"] }),
  riskController.suspendedDrivers
);
router.get(
  "/risk/high-drivers",
  requirePermission("risk.view", { scopes: ["global"] }),
  riskController.highRiskDrivers
);
router.patch(
  "/risk/driver/:id/reset",
  requirePermission("risk.review_case", { scopes: ["global"] }),
  riskController.resetFraudScore
);
router.get(
  "/risk/suspicious-orders",
  requirePermission("risk.view", { scopes: ["global"] }),
  riskController.suspiciousOrders
);

router.get(
  "/support/tickets",
  supportConsoleRole,
  requirePermission("tickets.view", { scopes: ["own", "team", "region", "global"] }),
  supportController.allTickets
);
router.get(
  "/support/tickets/list",
  supportConsoleRole,
  requirePermission("tickets.view", { scopes: ["own", "team", "region", "global"] }),
  supportController.listTickets
);
router.get(
  "/support/ticket/:id",
  supportConsoleRole,
  requirePermission("tickets.view", { scopes: ["own", "team", "region", "global"] }),
  supportController.getTicket
);
router.patch(
  "/support/ticket/:id/resolve",
  supportConsoleRole,
  requirePermission("tickets.resolve", { scopes: ["own", "team", "region", "global"] }),
  supportController.resolveTicket
);
router.patch(
  "/support/ticket/:id/status",
  supportConsoleRole,
  requirePermission("tickets.resolve", { scopes: ["own", "team", "region", "global"] }),
  supportController.updateStatus
);
router.patch(
  "/support/ticket/:id/assign",
  supportConsoleRole,
  requirePermission("tickets.assign", { scopes: ["own", "team", "region", "global"] }),
  supportController.assignTicket
);
router.post(
  "/support/ticket/:id/replies",
  supportConsoleRole,
  requirePermission("tickets.resolve", { scopes: ["own", "team", "region", "global"] }),
  supportController.addReply
);

router.patch(
  "/orders/:id/approve",
  requirePermission("orders.update_status", { scopes: ["region", "global"] }),
  DeliveryReviewController.approve
);
router.patch(
  "/orders/:id/reject",
  requirePermission("orders.update_status", { scopes: ["region", "global"] }),
  DeliveryReviewController.reject
);
router.patch(
  "/drivers/:id/suspend",
  requirePermission("drivers.suspend", { scopes: ["region", "global"] }),
  DriverManagementController.suspendDriver
);
router.patch(
  "/drivers/:id/activate",
  requirePermission("drivers.unsuspend", { scopes: ["region", "global"] }),
  DriverManagementController.activateDriver
);
router.post(
  "/payout/process",
  requirePermission("payouts.approve", { scopes: ["global"] }),
  financeConsoleRelation,
  PayoutController.forcePayout
);
router.get(
  "/fraud",
  requirePermission("risk.view", { scopes: ["global"] }),
  StatsController.fraudOverview
);

router.get(
  "/audit/export",
  requirePermission("audit.export", { scopes: ["global"] }),
  AuditController.exportCSV
);

module.exports = router;
