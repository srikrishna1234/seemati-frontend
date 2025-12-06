// drop-and-create-slug-index.js
// Usage: node drop-and-create-slug-index.js
// IMPORTANT: Backup DB before running this.

const { MongoClient } = require('mongodb');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017';
const DB_NAME = process.env.DB_NAME || 'yourDatabaseName';
const COLL = 'products';

async function main() {
  const client = new MongoClient(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
  await client.connect();
  console.log('Connected to', MONGO_URI, 'DB:', DB_NAME);
  const db = client.db(DB_NAME);
  const coll = db.collection(COLL);

  const indexes = await coll.indexes();
  console.log('Existing indexes:');
  indexes.forEach(i => console.log(i.name, JSON.stringify(i)));

  const slugIndex = indexes.find(i => {
    const k = i.key || {};
    return Object.keys(k).length === 1 && k.slug === 1;
  });

  if (slugIndex) {
    console.log('Found existing slug index:', slugIndex.name, JSON.stringify(slugIndex));
    if (slugIndex.name === 'slug_unique_sparse' && slugIndex.unique && slugIndex.sparse) {
      console.log('Desired index already exists. Nothing to do.');
    } else {
      console.log('Dropping existing slug index:', slugIndex.name);
      await coll.dropIndex(slugIndex.name);
      console.log('Dropped.');
      console.log('Creating desired index: slug_unique_sparse');
      await coll.createIndex({ slug: 1 }, { unique: true, sparse: true, name: 'slug_unique_sparse', background: true });
      console.log('Created slug_unique_sparse.');
    }
  } else {
    console.log('No existing slug index found — creating slug_unique_sparse.');
    await coll.createIndex({ slug: 1 }, { unique: true, sparse: true, name: 'slug_unique_sparse', background: true });
    console.log('Created slug_unique_sparse.');
  }

  await client.close();
  console.log('Done.');
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
