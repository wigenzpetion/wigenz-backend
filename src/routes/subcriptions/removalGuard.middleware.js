if (driver.subscription_status !== "ACTIVE") {
    return res.status(403).json({
      message: "Subscription unpaid. Withdrawal blocked."
    });
  }