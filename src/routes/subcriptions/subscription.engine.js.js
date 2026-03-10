const db = require('../../config/db');
const LedgerService = require('../fintech/ledger.service');
const eventBus = require('../../core/eventBus');

async function processWalletRenewals() {

  const client = await db.pool.connect();

  try {

    await client.query("BEGIN");

    const drivers = await client.query(`
      SELECT d.id,
             d.subscription_amount,
             d.subscription_status,
             w.available_balance
      FROM drivers d
      JOIN wallets w ON w.user_id = d.id
      WHERE d.subscription_expiry_date <= NOW()
      FOR UPDATE SKIP LOCKED
    `);

    for (const driver of drivers.rows) {

      if (driver.available_balance >= driver.subscription_amount) {

        // 🔐 Ledger Entry
        await LedgerService.createEntry({
          referenceId: driver.id,
          referenceType: "SUBSCRIPTION",
          debitAccountId: 2,
          creditAccountId: 4,
          amount: driver.subscription_amount,
          metadata: { driverId: driver.id }
        });

        await client.query(`
          UPDATE wallets
          SET available_balance = available_balance - $1
          WHERE user_id = $2
        `, [driver.subscription_amount, driver.id]);

        await client.query(`
          UPDATE drivers
          SET subscription_status = 'ACTIVE',
              subscription_expiry_date = NOW() + INTERVAL '1 month'
          WHERE id = $1
        `, [driver.id]);

        eventBus.emit("SUBSCRIPTION_RENEWED", {
          actorId: driver.id
        });

      } else {

        await client.query(`
          UPDATE drivers
          SET subscription_status = 'EXPIRED'
          WHERE id = $1
        `, [driver.id]);
      }
    }

    await client.query("COMMIT");

  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

module.exports = { processWalletRenewals };