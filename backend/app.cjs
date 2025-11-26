// backend/app.cjs
'use strict';

const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const morgan = require('morgan');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const path = require('path');

dotenv.config();

const app = express();

// Trust proxy in production for secure cookies
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

app.use(helmet());
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// CORS whitelist from env
const rawOrigins = process.env.FRONTEND_URLS || process.env.FRONTEND_URL || '';
const allowedOrigins = rawOrigins.split(',').map(s => s.trim()).filter(Boolean);
if (allowedOrigins.length === 0 && process.env.NODE_ENV !== 'production') {
  allowedOrigins.push('http://localhost:3000');
}
const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true); // allow server-to-server or curl (no origin)
    if (allowedOrigins.indexOf(origin) !== -1) return callback(null, true);
    return callback(new Error('CORS: Origin not allowed'), false);
  },
  credentials: true,
  optionsSuccessStatus: 200,
};
app.use(cors(corsOptions));

// Health check
app.get('/', (req, res) => res.status(200).json({ ok: true, env: process.env.NODE_ENV || 'development' }));

// Load routers lazily after DB connect (we'll mount later)

// Error handlers (basic)
app.use((err, req, res, next) => {
  console.error('ERROR:', err && err.message ? err.message : err);
  if (err && err.message && err.message.includes('CORS')) {
    return res.status(403).json({ error: 'CORS error: origin not allowed' });
  }
  res.status(err && err.status ? err.status : 500).json({ error: err && err.message ? err.message : 'Internal server error' });
});

// ---------- MONGODB connection + server start ----------

const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
  console.error('MONGO_URI is not set. Set it in Render environment variables.');
  process.exit(1);
}

const connectWithRetry = async (retries = 5, delayMs = 3000) => {
  for (let i = 0; i < retries; i++) {
    try {
      console.log(`[Mongo] Attempting connection to MongoDB (try ${i + 1}/${retries})...`);
      await mongoose.connect(MONGO_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        serverSelectionTimeoutMS: 10000,
        socketTimeoutMS: 45000,
      });
      console.log('[Mongo] Connected to MongoDB successfully.');
      return;
    } catch (err) {
      console.error('[Mongo] Connection error:', err && err.message ? err.message : err);
      if (i < retries - 1) {
        console.log(`[Mongo] Retry in ${delayMs}ms...`);
        await new Promise((r) => setTimeout(r, delayMs));
      } else {
        throw err;
      }
    }
  }
};

const startServer = async () => {
  try {
    await connectWithRetry(6, 5000);

    // Now that DB is connected, mount routers
    try {
      const authRouter = require('./src/routes/auth.cjs');
      const otpRouter = require('./src/routes/otpRoutes.cjs');
      const productRouter = require('./src/routes/productRoutes.cjs');
      if (authRouter) app.use('/api/auth', authRouter);
      if (otpRouter) app.use('/api/otp', otpRouter);
      if (productRouter) app.use('/api/products', productRouter);
    } catch (e) {
      console.error('[app] Router load error:', e && e.message ? e.message : e);
    }

    // Start server
    const PORT = process.env.PORT || process.env.SERVER_PORT || 10000;
    app.listen(PORT, () => {
      console.log(`Backend listening on port ${PORT} (NODE_ENV=${process.env.NODE_ENV || 'development'})`);
    });
  } catch (err) {
    console.error('[Startup] Failed to connect to MongoDB after retries. Exiting. Error:', err && err.message ? err.message : err);
    process.exit(1);
  }
};

startServer();

module.exports = app;
