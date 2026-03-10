  // srecuperer le prix global de l'abonnement
  async function getSubscriptionPrice() {
    const result = await db.query(
      "SELECT value FROM system_settings WHERE key = 'driver_monthly_subscription_price'"
    );
    return Number(result.rows[0].value);
  }

  // prelevement mensuel
  async function processMonthlySubscription(driverId, req) {

    const price = await getSubscriptionPrice();
  
    await db.query('BEGIN');
  
    try {
  
      await walletService.debit(driverId, price);
  
      await db.query(
        `UPDATE driver_subscriptions
         SET last_payment_date = NOW(),
             next_billing_date = NOW() + INTERVAL '1 month',
             status = 'active'
         WHERE driver_id = $1`,
        [driverId]
      );
  
      await db.query('COMMIT');
  
      eventBus.emit('SUBSCRIPTION_PAYMENT_SUCCESS', {
        actorId: driverId,
        actorRole: 'driver',
        targetId: driverId,
        amount: price,
        req
      });
  
    } catch (error) {
  
      await db.query('ROLLBACK');
  
      await db.query(
        `UPDATE driver_subscriptions
         SET status = 'suspended'
         WHERE driver_id = $1`,
        [driverId]
      );
  
      eventBus.emit('SUBSCRIPTION_PAYMENT_FAILED', {
        actorId: driverId,
        actorRole: 'driver',
        targetId: driverId,
        amount: price,
        reason: 'insufficient_balance'
      });
  
    }
  }

  //Coder la demande de pause
  async function requestPause(driverId, req) {

    const result = await db.query(
      "SELECT next_billing_date FROM driver_subscriptions WHERE driver_id = $1",
      [driverId]
    );
  
    if (!result.rows.length) return;
  
    const nextBilling = result.rows[0].next_billing_date;
  
    await db.query(`
      UPDATE driver_subscriptions
      SET pause_effective_date = $1
      WHERE driver_id = $2
    `, [nextBilling, driverId]);
  
    eventBus.emit('SUBSCRIPTION_PAUSE_REQUESTED', {
      actorId: driverId,
      actorRole: 'driver',
      targetId: driverId,
      effectiveDate: nextBilling,
      req
    });
  }