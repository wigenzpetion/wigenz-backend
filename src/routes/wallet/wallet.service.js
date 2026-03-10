const WalletRepository = require("./wallet.repository");
const eventBus = require("../../core/eventBus");

class WalletService {
  static parseAmount(amount) {
    const parsed = Number(amount);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      throw new Error("Amount must be a positive number");
    }
    return parsed;
  }

  // ==============================
  // DEBIT WALLET
  // ==============================
  static async debit(userId, amount) {
    if (!userId) {
      throw new Error("User ID is required");
    }

    const parsedAmount = this.parseAmount(amount);
    const wallet = await WalletRepository.findByUserId(userId);

    if (!wallet) {
      throw new Error("Wallet not found");
    }

    if (Number(wallet.available_balance) < parsedAmount) {
      throw new Error("Insufficient balance");
    }

    const updatedWallet = await WalletRepository.debitAvailable(
      userId,
      parsedAmount
    );

    eventBus.emit("WALLET_DEBITED", {
      userId,
      amount: parsedAmount
    });

    return updatedWallet;
  }

  // ==============================
  // WITHDRAW WALLET
  // ==============================
  static async withdraw(userId, amount) {
    if (!userId) {
      throw new Error("User ID is required");
    }

    const parsedAmount = this.parseAmount(amount);
    const wallet = await WalletRepository.findByUserId(userId);

    if (!wallet) {
      throw new Error("Wallet not found");
    }

    if (Number(wallet.available_balance) < parsedAmount) {
      throw new Error("Insufficient balance");
    }

    const updatedWallet = await WalletRepository.debitAvailable(
      userId,
      parsedAmount
    );

    eventBus.emit("WALLET_WITHDRAW", {
      userId,
      amount: parsedAmount
    });

    return updatedWallet;
  }

  // ==============================
  // CREDIT (USED BY PAYMENT PAYOUT)
  // ==============================
  static async credit(userId, amount) {
    if (!userId) {
      throw new Error("User ID is required");
    }

    const parsedAmount = this.parseAmount(amount);
    const wallet = await WalletRepository.findByUserId(userId);

    if (!wallet) {
      throw new Error("Wallet not found");
    }

    return WalletRepository.addAvailable(userId, parsedAmount);
  }

  // ==============================
  // CREDIT DRIVER (USED BY PAYOUT)
  // ==============================
  static async creditDriver(driverId, amount, subscriptionStatus) {
    if (!driverId) {
      throw new Error("Driver ID is required");
    }

    const parsedAmount = this.parseAmount(amount);

    if (subscriptionStatus === "ACTIVE") {
      return WalletRepository.addAvailable(driverId, parsedAmount);
    }

    return WalletRepository.addLocked(driverId, parsedAmount);
  }
}

module.exports = WalletService;