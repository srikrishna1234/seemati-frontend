// backend/app.cjs
// Full replacement app server (express) wiring.
// - Connects to MongoDB using MONGO_URI
// - Mounts API routes (uploadRoutes + optional existing routes)
// - Configures CORS using FRONTEND_URL or FRONTEND_URLS env var
// - Uses multer memory + S3 in uploadRoutes (separate file)
// - Health endpoint

const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');

require('dotenv').config();

const app = express();

// Configuration / env
const PORT = process.env.PORT || process.env.PORT || 4000;
const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;
const FRONTEND_URL = process.env.FRONTEND_URL || process.env.FRONTEND_ORIGIN || process.env.FRONTEND_URLS || process.env.ALLOWED_ORIGINS || 'https://seemati.in';
const ALLOW_CREDENTIALS = (process.env.CORS_ALLOW_CREDENTIALS || 'true') === 'true';

// ---- Basic middleware
app.use(helmet());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// ---- CORS config (allow your frontend origin(s))
const corsOptions = {
  origin: function(origin, callback) {
    // allow requests with no origin like mobile apps or curl
    if (!origin) return callback(null, true);

    // support comma-separated list of allowed origins in FRONTEND_URL
    const allowList = (FRONTEND_URL || '').split(',').map(s => s.trim()).filter(Boolean);
    if (allowList.length === 0) {
      return callback(null, true);
    }
    if (allowList.includes(origin) || allowList.includes(new URL(origin).origin)) {
      return callback(null, true);
    }
    callback(new Error('Not allowed by CORS'));
  },
  credentials: ALLOW_CREDENTIALS
};
app.use(cors(corsOptions));

// Optional: expose a simple health endpoint
app.get('/_health', (req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

// ---- MongoDB connection
(async function connectDB(){
  if (!MONGO_URI) {
    console.error('MONGO_URI not set. Exiting.');
    process.exit(1);
  }
  try {
    await mongoose.connect(MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('MongoDB connected');
  } catch (err) {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  }
})();

// ---- Mount your API routes
// Upload route (new S3-backed uploadRoute)
try {
  const uploadRoutes = require('./src/routes/uploadRoutes.cjs');
  app.use('/', uploadRoutes);
  console.log('Mounted uploadRoutes');
} catch (err) {
  console.warn('uploadRoutes not mounted:', String(err));
}

// If you have other API route files, mount them here.
// Example: product routes, auth routes (adjust paths if different)
try {
  const productRoutes = require('./src/routes/productRoutes.cjs');
  app.use('/api/products', productRoutes);
  console.log('Mounted productRoutes');
} catch (err) {
  // If your product routes file is located elsewhere or named differently this will fail harmlessly
  console.warn('productRoutes not found or not mounted (ok if you mount elsewhere):', String(err));
}

try {
  const authRoutes = require('./src/routes/authRoutes.cjs');
  app.use('/api/auth', authRoutes);
  console.log('Mounted authRoutes');
} catch (err) {
  console.warn('authRoutes not mounted:', String(err));
}

// If you previously served uploads statically in dev, DON'T rely on that in Render.
// We use S3 for uploads; keep static serve only for local dev if necessary:
if (process.env.NODE_ENV !== 'production') {
  const uploadsDir = path.join(__dirname, 'uploads');
  app.use('/uploads', express.static(uploadsDir));
  console.log('Static /uploads mounted for local dev only');
}

// ---- Error handling
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err && err.stack ? err.stack : err);
  if (res.headersSent) return next(err);
  res.status(500).json({ error: err.message || String(err) });
});

// ---- Start server (listen)
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT} — env ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;
