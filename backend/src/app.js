// backend/src/app.js
const express = require('express');
const path = require('path');
const cors = require('cors');

const app = express();
const path = require('path');
const uploadRoutes = require('./routes/uploadRoutes');


// NOTE: route imports - use paths relative to backend/src (this file)
const orderRoutes = require("./routes/orders"); // fixed path

// --- Middleware ---
app.use(cors({ origin: 'http://localhost:3000' })); // allow React frontend; dev-only
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// existing routes
app.use("/api/orders", orderRoutes);

// Serve static files (paths relative to backend/)
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));
app.use('/images', express.static(path.join(__dirname, '..', 'public', 'images')));

// --- Mount other routes ---
const adminProductRoutes = require('./routes/adminProduct');
const settingsRoutes = require('./routes/settings'); // <--- require settings routes

app.use('/admin-api', adminProductRoutes);
app.use('/admin-api', settingsRoutes);

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/products', uploadRoutes);
app.use('/admin-api/products', uploadRoutes);

// mount OTP routes
try {
  // Expect file at backend/src/routes/otpRoutes.js
  const otpRoutes = require('./routes/otpRoutes');
  app.use('/api/otp', otpRoutes);
} catch (err) {
  // if the otp route file isn't present, log and continue so app still starts
  console.warn("OTP routes not mounted (./routes/otpRoutes.js not found). Create the file to enable /api/otp endpoints.");
}

// Cart route (if exists)
try {
  const cartRoutes = require('./routes/cart');
  app.use('/api/cart', cartRoutes);
} catch (err) {
  // no cart routes — ignore
}

// Health check
app.get('/health', (req, res) => res.json({ ok: true }));

// 404 for other /api/* endpoints
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'API endpoint not found' });
});

// Generic error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Server error' });
});

module.exports = app;
