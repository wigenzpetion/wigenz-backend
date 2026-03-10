const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const db = require('./config/db');

// EventBus listeners (chargés au démarrage)
require('./routes/audit/audit.listener');
require('./routes/notification/notification.listener');
require('./routes/dispatch/dispatch.listener');
require('./routes/support/support.listener');
require('./routes/payment/payment.listener');
require('./routes/orderEngine/delivery.listener');

const logger = require('./middlewares/logger.middleware');
const errorHandler = require('./middlewares/error.middleware');

const userRoutes = require('./routes/clients/client.routes');
const walletRoutes = require('./routes/wallet/wallet.routes');
const driverRoutes = require('./routes/drivers/drivers.routes');
const adminRoutes = require('./routes/Admin/admin.routes');
const authRoutes = require('./routes/auth/auth.routes');
const paymentRoutes = require('./routes/payment/payment.routes');
const payoutRoutes = require('./routes/payout/payout.routes');
const orderRoutes = require('./routes/orderEngine/orders.routes');
const clientOrderRoutes = require('./routes/clients/orders.routes');
const dispatchRoutes = require('./routes/dispatch/dispatch.routes');
const supportRoutes = require('./routes/support/support.routes');

const app = express();
const corsOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map((v) => v.trim()).filter(Boolean)
  : ['http://localhost:3001'];

app.use(express.json());
app.use(helmet());
app.use(cors({
  origin: corsOrigins,
  credentials: true
}));
app.use(logger);

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});
app.use(limiter);

app.use('/users', userRoutes);
app.use('/wallet', walletRoutes);
app.use('/api/drivers', driverRoutes);
app.use('/admin', adminRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/payouts', payoutRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/client-orders', clientOrderRoutes);
app.use('/api/dispatch', dispatchRoutes);
app.use('/api/support', supportRoutes);

app.get('/health', async (req, res) => {
  try {
    await db.query('SELECT 1');
    res.json({
      status: 'ok',
      database: 'up',
      uptime: Math.floor(process.uptime()),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({
      status: 'degraded',
      database: 'down',
      uptime: Math.floor(process.uptime()),
      timestamp: new Date().toISOString()
    });
  }
});

app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.use(errorHandler);

module.exports = app;
