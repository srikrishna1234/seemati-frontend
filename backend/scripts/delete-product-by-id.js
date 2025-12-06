// backend/scripts/delete-product-by-id.js
// Usage:
//   set env MONGO_URI and DB_NAME (or edit below) then:
//   node backend/scripts/delete-product-by-id.js <productId>
//
// WARNING: This deletes a product document. Backup DB before running in production.

const { MongoClient, ObjectId } = require('mongodb');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017';
const DB_NAME = process.env.DB_NAME || 'seemati';
const COLL = 'products';

async function main() {
  const id = process.argv[2];
  if (!id) {
    console.error('Usage: node delete-product-by-id.js <productId>');
    process.exit(1);
  }

  const client = new MongoClient(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
  try {
    await client.connect();
    const db = client.db(DB_NAME);
    const coll = db.collection(COLL);

    const _id = ObjectId.isValid(id) ? new ObjectId(id) : id;
    const doc = await coll.findOne({ _id });

    if (!doc) {
      console.log('No product found with id:', id);
      return;
    }

    console.log('Found product:', { _id: doc._id.toString(), title: doc.title, slug: doc.slug });
    // confirm deletion prompt in interactive mode is not possible in one-liner, so delete now
    const res = await coll.deleteOne({ _id });
    if (res.deletedCount === 1) {
      console.log('Deleted product:', id);
    } else {
      console.log('No document deleted. deletedCount:', res.deletedCount);
    }
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  } finally {
    await client.close();
  }
}

main();
