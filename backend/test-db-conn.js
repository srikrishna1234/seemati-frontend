// backend/test-db-conn.js
require('dotenv').config();
const mongoose = require('mongoose');

const MONGO = process.env.MONGO_URI || process.env.MONGODB_URI || process.env.DATABASE_URL;
console.log('MONGO env present:', !!MONGO);

(async function test() {
  if (!MONGO) {
    console.error('ERROR: No MONGO URI found in env. Check backend/.env or environment variables.');
    process.exit(2);
  }
  try {
    // short timeout so test returns quickly
    await mongoose.connect(MONGO, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000
    });
    console.log('OK: Connected to MongoDB (test).');
    const ping = await mongoose.connection.db.admin().ping();
    console.log('Ping response:', ping);
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Mongo connect error message:', err && err.message);
    if (err && err.stack) console.error(err.stack);
    process.exit(3);
  }
})();
