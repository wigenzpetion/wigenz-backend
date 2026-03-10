const PaymentRepository = require("../payment/payment.repository");
const PayoutRepository = require("../payout/payout.repository");
const DriverRepository = require("../drivers/driver.repository");

class StatService {

  /**
   * 📊 Financial Overview
   */
  static async financialOverview() {

    const payments = await PaymentRepository.findAll({});
    const payouts = await PayoutRepository.findAll({});

    const totalRevenue = payments
      .filter(p => p.status === "COMPLETED")
      .reduce((sum, p) => sum + Number(p.amount), 0);

    const totalRefunded = payments
      .filter(p => p.status === "REFUNDED")
      .reduce((sum, p) => sum + Number(p.amount), 0);

    const totalPayouts = payouts
      .filter(p => p.status === "PAID")
      .reduce((sum, p) => sum + Number(p.amount), 0);

    return {
      totalRevenue,
      totalRefunded,
      totalPayouts,
      netProfit: totalRevenue - totalPayouts - totalRefunded
    };
  }

  /**
   * 🚚 Driver Stats
   */
  static async driverStats() {

    const drivers = await DriverRepository.findAll({});

    const total = drivers.length;
    const active = drivers.filter(d => d.status === "ACTIVE").length;
    const suspended = drivers.filter(d => d.status === "SUSPENDED").length;
    const pending = drivers.filter(d => d.status === "PENDING").length;

    return {
      totalDrivers: total,
      activeDrivers: active,
      suspendedDrivers: suspended,
      pendingDrivers: pending
    };
  }

  /**
   * 📈 Global Dashboard
   */
  static async globalDashboard() {

    const financial = await this.financialOverview();
    const drivers = await this.driverStats();

    return {
      ...financial,
      ...drivers
    };
  }
}

module.exports = StatService;
