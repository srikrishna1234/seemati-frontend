// scripts/migrateNormalizeColors.js
const { MongoClient } = require('mongodb');

const uri = "mongodb+srv://srikrishnaapparells_db_user:srikrishna123@cluster0.upmuedn.mongodb.net/seemati?retryWrites=true&w=majority&appName=Cluster0";

const colorMap = {
  // map common synonyms to canonical value (all canonical values are lowercased)
  'navy': 'navy blue',
  'navyblue': 'navy blue',
  'navy blue': 'navy blue',
  'red': 'red',
  'maroon': 'maroon',
  'maroon red': 'maroon',
  'black': 'black',
  'blk': 'black',
  'white': 'white',
  'off white': 'white',
  'ivory': 'white',
  'pink': 'pink',
  'light pink': 'pink',
  'blue': 'blue',
  'sky blue': 'light blue',
  'light blue': 'light blue',
  'green': 'green',
  'olive': 'olive green',
  'olive green': 'olive green',
  'beige': 'beige',
  'grey': 'grey',
  'gray': 'grey',
  'silver': 'grey',
  'brown': 'brown',
  // add more as you discover them
};

function canonicalizeColor(raw) {
  if (!raw) return null;
  let s = String(raw).trim().toLowerCase();
  s = s.replace(/\s+/g, ' ');
  // remove punctuation
  s = s.replace(/[^\w\s]/g, '');
  if (colorMap[s]) return colorMap[s];
  // if not in map, return the cleaned value
  return s;
}

(async () => {
  const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
  try {
    await client.connect();
    const db = client.db();
    const col = db.collection('products');

    const cursor = col.find({});
    let updated = 0;
    while (await cursor.hasNext()) {
      const doc = await cursor.next();
      const sources = [];

      // gather possible color sources
      if (doc.colors) sources.push(doc.colors);
      if (doc.color) sources.push(doc.color);
      if (doc.colorVariant) sources.push(doc.colorVariant);
      if (doc.attributes && typeof doc.attributes === 'object') {
        // example attributes: { color: 'Red', size: 'M' }
        if (doc.attributes.color) sources.push(doc.attributes.color);
      }

      // flatten and normalize
      const flattened = sources
        .flatMap(s => {
          if (!s) return [];
          if (Array.isArray(s)) return s;
          if (typeof s === 'string') {
            // split by commas or slashes
            return s.split(/[,\/|]+/).map(x => x.trim()).filter(Boolean);
          }
          // if object or others, ignore
          return [];
        })
        .map(canonicalizeColor)
        .filter(Boolean);

      const unique = Array.from(new Set(flattened));

      // if nothing found, leave empty array (or optionally add 'unknown')
      const newColors = unique;

      const update = {
        $set: { colors: newColors },
        $unset: { color: "", colorVariant: "" } // optional: remove old fields
      };

      await col.updateOne({ _id: doc._id }, update);
      updated++;
    }

    console.log(`Migration complete. Updated ${updated} product documents.`);
    await client.close();
  } catch (err) {
    console.error('Migration error', err);
    await client.close();
    process.exit(1);
  }
})();
