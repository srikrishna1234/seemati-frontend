// backend/src/db.js
const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI || 'your-mongo-uri-here';

// options tuned to avoid buffering surprises
const opts = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 10000 // 10s -> fail fast if cannot reach server
};

async function connectDB() {
  try {
    await mongoose.connect(MONGO_URI, opts);
    console.log('✅ MongoDB connected');
    return mongoose;
  } catch (err) {
    console.error('❌ MongoDB connection error:', err.message);
    throw err;
  }
}

module.exports = connectDB;
