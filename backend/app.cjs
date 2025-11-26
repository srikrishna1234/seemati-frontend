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

// Trust proxy in production
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// Security + middleware
app.use(helmet());
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

/* ---------------------------------------------
   STATIC UPLOADS FOLDER (IMPORTANT)
   This serves images like /uploads/abc123.jpg
----------------------------------------------*/
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

/* ---------------------------------------------
   CORS CONFIGURATION
----------------------------------------------*/
let rawOrigins = process.env.FRONTEND_URLS || process.env.FRONTEND_URL || '';

if (rawOrigins.trim().toUpperCase().startsWith('FRONTEND_URLS=')) {
  rawOrigins = rawOrigins.trim().substring('FRONTEND_URLS='.length);
}

const allowedOrigins = rawOrigins
  .split(/[,\\n]/)
  .map((s) => (s || '').trim())
  .filter(Boolean);

// Always include production domains
['https://seemati.in', 'https://www.seemati.in'].forEach((h) => {
  if (!allowedOrigins.includes(h)) allowedOrigins.push(h);
});

console.log('[CORS] FRONTEND_URLS raw:', rawOrigins);
console.log('[CORS] allowedOrigins:', allowedOrigins);

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);

    if (allowedOrigins.indexOf(origin) !== -1) return callback(null, true);

    if (process.env.NODE_ENV !== 'production' && origin.startsWith('http://localhost')) {
      return callback(null, true);
    }

    try {
      const u = new URL(origin);
      if (u.hostname && u.hostname.endsWith('.vercel.app')) {
        console.warn('[CORS] Allowing vercel preview:', origin);
        return callback(null, true);
      }
    } catch (err) {}

    console.error('ERROR: CORS blocked ->', origin);
    return callback(new Error('CORS: Origin not allowed'), false);
  },
  credentials: true,
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));

/* ---------------------------------------------
   BASIC HEALTH CHECK
----------------------------------------------*/
app.get('/', (req, res) =>
  res.status(200).json({ ok: true, env: process.env.NODE_ENV || 'development' })
);

/* ---------------------------------------------
   ERROR HANDLER (keep this before routers if needed)
----------------------------------------------*/
app.use((err, req, res, next) => {
  console.error('ERROR:', err && err.message ? err.message : err);

  if (err && err.message && err.message.includes('CORS')) {
    return res.status(403).json({ error: 'CORS error: origin not allowed' });
  }

  res.status(err?.status || 500).json({
    error: err?.message || 'Internal server error',
  });
});

/* ---------------------------------------------
   MONGO CONNECTION + ROUTERS
----------------------------------------------*/
const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
  console.error('MONGO_URI missing in environment variables.');
  process.exit(1);
}

const connectWithRetry = async (retries = 6, delayMs = 5000) => {
  for (let i = 0; i < retries; i++) {
    try {
      console.log(`[Mongo] Connecting (attempt ${i + 1}/${retries})...`);
      await mongoose.connect(MONGO_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        serverSelectionTimeoutMS: 10000,
        socketTimeoutMS: 45000,
      });
      console.log('[Mongo] Connected successfully.');
      return;
    } catch (err) {
      console.error('[Mongo] Error:', err.message || err);
      if (i < retries - 1) {
        console.log(`[Mongo] Retrying in ${delayMs}ms...`);
        await new Promise((r) => setTimeout(r, delayMs));
      } else {
        throw err;
      }
    }
  }
};

const startServer = async () => {
  try {
    await connectWithRetry();

    // Load routers after DB connects
    try {
      const authRouter = require('./src/routes/auth.cjs');
      const otpRouter = require('./src/routes/otpRoutes.cjs');
      const productRouter = require('./src/routes/productRoutes.cjs');

      if (authRouter) app.use('/api/auth', authRouter);
      if (otpRouter) app.use('/api/otp', otpRouter);
      if (productRouter) app.use('/api/products', productRouter);
    } catch (e) {
      console.error('[Router Load Error]:', e.message || e);
    }

    const PORT = process.env.PORT || process.env.SERVER_PORT || 10000;
    app.listen(PORT, () => {
      console.log(
        `Backend running on port ${PORT} (ENV=${process.env.NODE_ENV || 'development'})`
      );
    });
  } catch (err) {
    console.error('[Startup] MongoDB connection failed. Error:', err);
    process.exit(1);
  }
};

startServer();

module.exports = app;
