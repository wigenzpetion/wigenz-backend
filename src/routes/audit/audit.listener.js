const eventBus = require('../../core/eventBus');
const AuditService = require('./audit.service');

// ===== ORDERS =====

eventBus.on('ORDER_CREATED', async (order) => {
  await AuditService.record({
    actorId: order.user_id,
    actorRole: 'CLIENT',
    action: 'ORDER_CREATED',
    targetType: 'order',
    targetId: order.id,
    metadata: {
      pickup_address: order.pickup_address,
      delivery_address: order.delivery_address
    }
  });
});

// ===== WALLET =====

eventBus.on('WALLET_DEBITED', async (payload) => {
  await AuditService.record({
    actorId: payload.actorId,
    actorRole: payload.actorRole,
    action: 'WALLET_DEBITED',
    targetType: 'wallet',
    targetId: payload.targetId,
    metadata: { amount: payload.amount }
  });
});

eventBus.on('WITHDRAW_SUCCESS', async (payload) => {
  await AuditService.record({
    actorId: payload.actorId,
    actorRole: payload.actorRole,
    action: 'WITHDRAW_SUCCESS',
    targetType: 'wallet',
    targetId: payload.targetId,
    metadata: {
      amount: payload.amount,
      previousBalance: payload.previousBalance,
      newBalance: payload.newBalance
    }
  });
});

eventBus.on('WITHDRAW_BLOCKED', async (payload) => {
  await AuditService.record({
    actorId: payload.actorId,
    actorRole: payload.actorRole,
    action: 'WITHDRAW_BLOCKED',
    targetType: 'wallet',
    targetId: payload.targetId,
    metadata: {
      amount: payload.amount,
      reason: payload.reason,
      fraudScore: payload.fraudScore
    }
  });
});

// ===== REFUND =====

eventBus.on('REFUND_EXECUTED', async (payload) => {
  await AuditService.record({
    actorId: payload.actorId,
    actorRole: payload.actorRole,
    action: 'REFUND_EXECUTED',
    targetType: 'payment',
    targetId: payload.targetId,
    metadata: {
      amount: payload.amount
    }
  });
});

// ===== ADMIN ACTIONS =====

eventBus.on('DELIVERY_APPROVED_ADMIN', async (payload) => {
  await AuditService.record({
    actorId: payload.actorId,
    actorRole: payload.actorRole,
    action: 'DELIVERY_APPROVED_ADMIN',
    targetType: 'order',
    targetId: payload.targetId
  });
});

eventBus.on('DRIVER_SUSPENDED', async (payload) => {
  await AuditService.record({
    actorId: payload.actorId,
    actorRole: payload.actorRole,
    action: 'DRIVER_SUSPENDED',
    targetType: 'driver',
    targetId: payload.targetId,
    metadata: {
      reason: payload.reason
    }
  });
});

// ===== PAYOUT =====

eventBus.on('PAYOUT_EXECUTED', async (payload) => {
  await AuditService.record({
    actorId: payload.actorId,
    actorRole: payload.actorRole,
    action: 'PAYOUT_EXECUTED',
    targetType: 'driver',
    targetId: payload.targetId,
    metadata: {
      totalAmount: payload.totalAmount,
      ordersCount: payload.ordersCount
    }
  });
});

// ===== EXISTING EVENTS =====

eventBus.on('USER_DELETED', async (payload) => {
  await AuditService.record({
    actorId: payload.actorId,
    actorRole: payload.actorRole,
    action: 'USER_DELETED',
    targetType: 'user',
    targetId: payload.targetId
  });
});

eventBus.on('SUBSCRIPTION_PLAN_CHANGED', async (payload) => {
  await AuditService.record({
    actorId: payload.actorId,
    action: 'SUBSCRIPTION_PLAN_CHANGED',
    targetType: 'subscription',
    targetId: payload.targetId,
    metadata: {
      oldPlan: payload.oldPlan,
      newPlan: payload.newPlan
    }
  });
});

eventBus.on('SUBSCRIPTION_PAYMENT_FAILED', async (payload) => {
  await AuditService.record({
    actorId: payload.actorId,
    action: 'SUBSCRIPTION_PAYMENT_FAILED',
    targetType: 'subscription',
    targetId: payload.targetId,
    metadata: { reason: payload.reason }
  });
});

// ===== SUPPORT (tickets) =====

eventBus.on('TICKET_OPENED', async (payload) => {
  await AuditService.record({
    actorId: payload.actorId,
    actorRole: payload.actorRole,
    action: 'TICKET_OPENED',
    targetType: 'support_ticket',
    targetId: payload.ticket?.id,
    metadata: { subject: payload.ticket?.subject, order_id: payload.ticket?.order_id }
  });
});

eventBus.on('TICKET_REPLIED', async (payload) => {
  await AuditService.record({
    actorId: payload.actorId,
    actorRole: payload.actorRole,
    action: 'TICKET_REPLIED',
    targetType: 'support_ticket',
    targetId: payload.ticket?.id,
    metadata: { replyId: payload.reply?.id }
  });
});

eventBus.on('TICKET_RESOLVED', async (payload) => {
  await AuditService.record({
    actorId: payload.actorId,
    actorRole: payload.actorRole,
    action: 'TICKET_RESOLVED',
    targetType: 'support_ticket',
    targetId: payload.ticket?.id,
    metadata: { subject: payload.ticket?.subject }
  });
});