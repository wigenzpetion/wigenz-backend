/**
 * Commission Utility
 * Handles platform commission calculations
 */

class Commission {

    /**
     * Calculate commission based on percentage
     * @param {number} amount
     * @param {number} percentage
     */
    static calculatePercentage(amount, percentage) {
      const commission = (amount * percentage) / 100;
      const net = amount - commission;
  
      return {
        grossAmount: amount,
        commissionAmount: Number(commission.toFixed(2)),
        netAmount: Number(net.toFixed(2)),
        commissionRate: percentage
      };
    }
  
    /**
     * Calculate commission with fixed + percentage
     * Example: 10% + $2 fixed
     */
    static calculateHybrid(amount, percentage, fixedFee) {
  
      const percentageFee = (amount * percentage) / 100;
      const commission = percentageFee + fixedFee;
      const net = amount - commission;
  
      return {
        grossAmount: amount,
        commissionAmount: Number(commission.toFixed(2)),
        netAmount: Number(net.toFixed(2)),
        commissionRate: percentage,
        fixedFee
      };
    }
  
    /**
     * Dynamic commission by role or driver tier
     */
    static calculateByDriverTier(amount, tier) {
  
      const tiers = {
        BRONZE: 25,
        SILVER: 20,
        GOLD: 15,
        VIP: 10
      };
  
      const rate = tiers[tier] || 25;
  
      return this.calculatePercentage(amount, rate);
    }
  }
  
  module.exports = Commission;