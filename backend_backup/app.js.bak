// backend/app.js
require('dotenv').config(); // load backend/.env first

const express = require('express');
const cors = require('cors');
const path = require('path');

const connectDB = require('./src/db'); // your DB connector

const cartRoutes = require('./src/routes/cartRoutes');
const adminProductRouter = require('./src/routes/adminProduct');

const app = express();

// middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ✅ Serve static images from backend/public/images with debug log
const imagesPath = path.join(__dirname, 'public', 'images');
console.log('Serving images from =', imagesPath);
app.use('/images', express.static(imagesPath));
// serve uploaded product images (used by admin product uploads)
const uploadsPath = path.join(__dirname, 'uploads');
console.log('Serving uploads from =', uploadsPath);
app.use('/uploads', express.static(uploadsPath));

// Register routes
app.use('/cart', cartRoutes);
app.use(adminProductRouter); // mounts routes such as /admin/products
// compatibility: respond to old frontend path /admin-api/products
app.get('/admin-api/products', async (req, res, next) => {
  try {
    // Try to use the real model if present
    let Product = null;
    try { Product = require('./models/Product'); } catch (e) { Product = null; }

    if (Product) {
      const list = await Product.find().lean();
      return res.json(list);
    }

    // fallback sample — matches adminProduct fallback
    return res.json([
      {
        title: 'Sample Leggings',
        name: 'Leggings',
        price: 299,
        images: ['/images/leggings.png'],
        description: 'Comfortable sample leggings',
        createdAt: new Date()
      }
    ]);
  } catch (err) {
    next(err);
  }
});

// root health-check
app.get('/', (req, res) => {
  res.json({ message: 'Backend is running 🎉' });
});

// 404 handler for API routes (returns JSON instead of HTML)
app.use((req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/admin') || req.path.startsWith('/cart') || req.path.startsWith('/images')) {
    return res.status(404).json({ error: 'Not Found', path: req.path });
  }
  next();
});

// basic error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(err.status || 500).json({ error: err.message || 'Internal Server Error' });
});

// start server only after DB connects
const PORT = process.env.PORT || 4000;

connectDB()
  .then(() => {
    console.log('✅ MongoDB connected (confirmed in app.js)');
    app.listen(PORT, () => {
      console.log(`✅ Server running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('❌ Failed to connect to MongoDB — server not started.');
    console.error(err);
    // optionally exit so process manager can restart after you fix .env / network
    // process.exit(1);
  });

module.exports = app;
