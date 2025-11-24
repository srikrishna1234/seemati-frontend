'use strict';

const mongoose = require('mongoose');

const uri = process.env.MONGODB_URI || process.env.MONGO_URI || '';

if (!uri) {
  console.error('[Mongo] No MongoDB URI found in env (checked MONGODB_URI and MONGO_URI).');
}

mongoose.set('strictQuery', false);

const connectOptions = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 20000,
};

async function connectWithRetry() {
  try {
    console.info('[Mongo] Attempting connection to MongoDB...');
    await mongoose.connect(uri, connectOptions);
    console.info('[Mongo] Connected to MongoDB successfully.');
  } catch (err) {
    console.error('[Mongo] Connection attempt failed:', err && err.message ? err.message : err);
    console.error(err);
    console.info('[Mongo] Waiting 5s before retrying...');
    await new Promise(r => setTimeout(r, 5000));
    try {
      await mongoose.connect(uri, connectOptions);
      console.info('[Mongo] Connected to MongoDB on retry.');
    } catch (err2) {
      console.error('[Mongo] Retry failed:', err2 && err2.message ? err2.message : err2);
      console.error(err2);
    }
  }
}

connectWithRetry();

module.exports = mongoose;
