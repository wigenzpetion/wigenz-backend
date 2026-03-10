// notification service chauffeur
const emailService = require('./email.service');
const pushService = require('./push.service');
const db = require('../../config/db');

class NotificationService {

  static async notifyAdmins(subject, message) {
    const result = await db.query(
      "SELECT email FROM users WHERE role IN ('ADMIN', 'SUPER_ADMIN') AND email IS NOT NULL",
      []
    );
    for (const row of result.rows) {
      if (row.email) {
        await emailService.sendAlert(row.email, subject, message).catch(() => {});
      }
    }
  }

  static async notifyClient(userId, message) {
    const result = await db.query(
      "SELECT email, push_token FROM users WHERE id = $1",
      [userId]
    );
    const user = result.rows[0];
    if (!user) return;

    if (user.email) {
      await emailService.send(
        user.email,
        "Wigenz - Mise à jour commande",
        message
      );
    }

    if (user.push_token) {
      await pushService.send(user.push_token, "Wigenz", message);
    }
  }

  static async getDriver(driverId) {
    const result = await db.query(
      "SELECT email, push_token FROM drivers WHERE id = $1",
      [driverId]
    );
    return result.rows[0];
  }

  static async notifyRetry(payload) {
    const driver = await this.getDriver(payload.actorId);

    await emailService.send(
      driver.email,
      "Subscription Payment Retry",
      `We attempted payment (attempt ${payload.attempt}). Please ensure sufficient balance.`
    );

    await pushService.send(
      driver.push_token,
      "Subscription Retry",
      `Attempt ${payload.attempt} failed. Please fund your wallet.`
    );
  }

  static async notifyGrace(payload) {
    const driver = await this.getDriver(payload.actorId);

    await emailService.send(
      driver.email,
      "Grace Period Started",
      "Your subscription is in grace period (14 days). Please regularize."
    );

    await pushService.send(
      driver.push_token,
      "Grace Period",
      "You have 14 days to regularize your subscription."
    );
  }

  static async notifySuspended(payload) {
    const driver = await this.getDriver(payload.actorId);

    await emailService.send(
      driver.email,
      "Subscription Suspended",
      "Your account has been suspended due to unpaid subscription."
    );

    await pushService.send(
      driver.push_token,
      "Account Suspended",
      "Your access has been temporarily suspended."
    );
  }

  static async notifyPaymentSuccess(payload) {
    const driver = await this.getDriver(payload.actorId);

    await emailService.send(
      driver.email,
      "Subscription Payment Successful",
      "Your subscription payment has been processed successfully."
    );

    await pushService.send(
      driver.push_token,
      "Payment Successful",
      "Your subscription is now active."
    );
  }
}

module.exports = NotificationService;
