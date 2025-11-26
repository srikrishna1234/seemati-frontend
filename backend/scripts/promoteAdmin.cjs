// backend/scripts/promoteAdmin.cjs
'use strict';
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { MongoClient } = require('mongodb');

(async () => {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error('MONGO_URI not found in .env');
    process.exit(1);
  }
  const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
  try {
    await client.connect();
    const db = client.db(); // DB taken from the URI
    const users = db.collection('users'); // change if your collection name differs
    const phone = '9042163246';
    const res = await users.updateOne(
      { phone },
      { $addToSet: { roles: 'admin' } }
    );
    console.log('Matched:', res.matchedCount, 'Modified:', res.modifiedCount);
    if (res.matchedCount === 0) {
      console.log('No user found with phone', phone);
    } else {
      console.log('User promoted to admin successfully.');
    }
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.close();
  }
})();
