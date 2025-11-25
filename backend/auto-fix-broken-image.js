// auto-fix-broken-image.js
// Safe auto-fixer for broken image references.
// USAGE (dry-run, default):
// $env:MONGO_URI="mongodb+srv://..."; node auto-fix-broken-image.js
//
// To actually apply changes:
// $env:MONGO_URI="mongodb+srv://..."; $env:DRY_RUN="false"; node auto-fix-broken-image.js
//
// Optionally delete file from local uploads:
// $env:UPLOADS_PATH="C:\\MyWebsite\\seemati-ladies-wear\\backend\\uploads" node auto-fix-broken-image.js

const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');

const MONGO = process.env.MONGO_URI;
const TARGET = '1763637644196_6.png';
const DRY_RUN = (process.env.DRY_RUN || 'true').toLowerCase() !== 'false';
const UPLOADS_PATH = process.env.UPLOADS_PATH || '';

if (!MONGO) {
  console.error('Set MONGO_URI env var and try again.');
  process.exit(1);
}

function findAndPrepareChanges(obj, target, pathSoFar = '') {
  const ops = { unset: [], pull: [], set: [] };
  let modified = false;

  if (Array.isArray(obj)) {
    const original = obj.slice();
    const filtered = original.filter(v => {
      if (typeof v === 'string' && (v === target || v.includes(target))) {
        modified = true;
        return false;
      }
      return true;
    });
    if (modified) ops.set.push({ path: pathSoFar, value: filtered });

    original.forEach((v, idx) => {
      if (v && typeof v === 'object') {
        const nested = findAndPrepareChanges(v, target, `${pathSoFar}.${idx}`);
        if (nested.modified) {
          modified = true;
          ops.unset.push(...nested.operations.unset);
          ops.pull.push(...nested.operations.pull);
          ops.set.push(...nested.operations.set);
        }
      }
    });
    return { modified, operations: ops };
  }

  if (obj && typeof obj === 'object') {
    for (const key of Object.keys(obj)) {
      const val = obj[key];
      const currentPath = pathSoFar ? `${pathSoFar}.${key}` : key;

      if (typeof val === 'string') {
        if (val === target) {
          modified = true;
          ops.unset.push(currentPath);
        } else if (val.includes(target)) {
          const cleaned = val.split(target).join('');
          modified = true;
          ops.set.push({ path: currentPath, value: cleaned });
        }
      } else if (Array.isArray(val)) {
        const filtered = val.filter(v => !(typeof v === 'string' && (v === target || v.includes(target))));
        if (filtered.length !== val.length) {
          modified = true;
          ops.set.push({ path: currentPath, value: filtered });
        }

        val.forEach((el, idx) => {
          if (el && typeof el === 'object') {
            const nested = findAndPrepareChanges(el, target, `${currentPath}.${idx}`);
            if (nested.modified) {
              modified = true;
              ops.unset.push(...nested.operations.unset);
              ops.pull.push(...nested.operations.pull);
              ops.set.push(...nested.operations.set);
            }
          }
        });
      } else if (val && typeof val === 'object') {
        const nested = findAndPrepareChanges(val, target, currentPath);
        if (nested.modified) {
          modified = true;
          ops.unset.push(...nested.operations.unset);
          ops.pull.push(...nested.operations.pull);
          ops.set.push(...nested.operations.set);
        }
      }
    }
  }

  return { modified, operations: ops };
}

function buildUpdateObject(ops) {
  const update = {};
  if (ops.unset.length) {
    update.$unset = {};
    ops.unset.forEach(p => update.$unset[p] = "");
  }
  if (ops.set.length) {
    update.$set = update.$set || {};
    ops.set.forEach(s => update.$set[s.path] = s.value);
  }
  return update;
}

(async () => {
  const client = new MongoClient(MONGO, { useNewUrlParser: true, useUnifiedTopology: true });
  await client.connect();
  const db = client.db(); // DB from URI
  console.log('DB:', db.databaseName, 'DRY_RUN:', DRY_RUN, 'TARGET:', TARGET);

  const cols = await db.listCollections().toArray();
  let totalMatches = 0;
  let totalModified = 0;

  for (const c of cols) {
    const col = db.collection(c.name);
    const docs = await col.find({}).toArray();

    for (const doc of docs) {
      const raw = JSON.stringify(doc);
      if (!raw.includes(TARGET)) continue;

      totalMatches++;
      console.log(`\nFOUND in collection: ${c.name}, _id: ${doc._id}`);

      const { modified, operations } = findAndPrepareChanges(doc, TARGET, '');
      if (!modified) {
        console.log('  -> Found only inside long string but no actionable change.');
        continue;
      }

      const update = buildUpdateObject(operations);
      console.log('  -> Planned update:', JSON.stringify(update, null, 2));

      if (!DRY_RUN) {
        const res = await col.updateOne({ _id: doc._id }, update);
        console.log('  -> updateOne result:', res.modifiedCount);
        if (res.modifiedCount > 0) totalModified++;
      } else {
        console.log('  -> Dry run: no DB write.');
      }
    }
  }

  if (UPLOADS_PATH) {
    const fp = path.join(UPLOADS_PATH, TARGET);
    if (fs.existsSync(fp)) {
      console.log('Filesystem: found file at', fp);
      if (!DRY_RUN) {
        fs.unlinkSync(fp);
        console.log('Filesystem: deleted.');
      } else {
        console.log('Filesystem: dry-run, not deleting.');
      }
    }
  }

  console.log('\nSCAN COMPLETE. Documents found:', totalMatches, ' Documents modified:', totalModified);
  await client.close();
})();
