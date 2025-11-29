// backend/scripts/migrate-uploads-to-s3.js
/**
 * Migration script (no ACL) - AWS SDK v3
 * Usage:
 *   node migrate-uploads-to-s3.js        # real run
 *   node migrate-uploads-to-s3.js --dry # simulate only
 *
 * Ensure env (backend/.env) contains:
 *   MONGO_URI, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY,
 *   AWS_REGION, S3_BUCKET_NAME
 * Optional:
 *   S3_BASE_URL (for public URL building), S3_FORCE_PATH_STYLE
 */

require('dotenv').config({ path: __dirname + '/../.env' });
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

const { S3Client, PutObjectCommand, HeadBucketCommand } = require('@aws-sdk/client-s3');
const { STSClient, GetCallerIdentityCommand } = require('@aws-sdk/client-sts');

const DRY = process.argv.includes('--dry');
const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');

const {
  AWS_REGION,
  S3_BUCKET_NAME: rawBucket,
  S3_BASE_URL,
  S3_FORCE_PATH_STYLE,
  MONGO_URI,
} = process.env;

const REGION = AWS_REGION || 'ap-south-1';
const S3_BUCKET_NAME = rawBucket ? rawBucket.trim() : rawBucket;

function mimeTypeFromFilename(name) {
  const ext = (path.extname(name) || '').toLowerCase();
  if (ext === '.png') return 'image/png';
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  if (ext === '.gif') return 'image/gif';
  if (ext === '.svg') return 'image/svg+xml';
  return 'application/octet-stream';
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

if (!MONGO_URI) {
  console.error('ERROR: MONGO_URI env var not set.');
  process.exit(1);
}
if (!S3_BUCKET_NAME) {
  console.error('ERROR: S3_BUCKET_NAME env var not set or blank.');
  process.exit(1);
}
if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
  console.error('ERROR: AWS credentials not found in env (AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY).');
  process.exit(1);
}

const s3ClientConfig = { region: REGION };
// Do NOT set endpoint to a value that contains the bucket name.
// Only set endpoint for custom S3 services (and in that case set forcePathStyle true).
if (S3_BASE_URL && !S3_BASE_URL.includes(S3_BUCKET_NAME)) {
  s3ClientConfig.endpoint = S3_BASE_URL;
  if (S3_FORCE_PATH_STYLE && (S3_FORCE_PATH_STYLE === 'true' || S3_FORCE_PATH_STYLE === '1')) {
    s3ClientConfig.forcePathStyle = true;
  }
}

const s3 = new S3Client(s3ClientConfig);
const sts = new STSClient({ region: REGION });

async function showIdentity() {
  try {
    const id = await sts.send(new GetCallerIdentityCommand({}));
    console.log('AWS caller identity:', JSON.stringify(id));
  } catch (err) {
    console.warn('Warning: STS getCallerIdentity failed:', err && err.message);
  }
}

async function headBucket(bucket) {
  try {
    await s3.send(new HeadBucketCommand({ Bucket: bucket }));
    return true;
  } catch (err) {
    throw err;
  }
}

async function uploadFileToS3(filename) {
  const key = `products/${filename}`;
  const filepath = path.join(UPLOADS_DIR, filename);
  const body = fs.readFileSync(filepath);

  // NOTE: NO 'ACL' field here because bucket enforces owner and disallows ACLs
  const params = {
    Bucket: S3_BUCKET_NAME,
    Key: key,
    Body: body,
    ContentType: mimeTypeFromFilename(filename),
    // ACL intentionally omitted
  };

  const cmd = new PutObjectCommand(params);
  await s3.send(cmd);

  // Build public URL for stored object:
  if (S3_BASE_URL) {
    const base = S3_BASE_URL.replace(/\/$/, '');
    // If S3_BASE_URL is a custom endpoint that doesn't include the bucket, append bucket/key
    if (!S3_BASE_URL.includes(S3_BUCKET_NAME)) {
      return `${base}/${S3_BUCKET_NAME}/${encodeURIComponent(key)}`;
    }
    // If S3_BASE_URL already points to the bucket (public URL), just append key
    return `${base}/${encodeURIComponent(key)}`;
  } else {
    return `https://${S3_BUCKET_NAME}.s3.${REGION}.amazonaws.com/${encodeURIComponent(key)}`;
  }
}

async function main() {
  console.log('--- migrate-uploads-to-s3: start ---');
  console.log('Region:', REGION);
  console.log('Bucket (raw):', JSON.stringify(rawBucket));
  console.log('Bucket (trimmed):', JSON.stringify(S3_BUCKET_NAME));
  console.log('S3_BASE_URL:', S3_BASE_URL || '(not set)');
  console.log('S3_FORCE_PATH_STYLE:', S3_FORCE_PATH_STYLE || '(not set)');
  console.log('DRY RUN:', DRY);
  console.log('');

  await showIdentity();

  try {
    console.log('Checking S3 bucket accessibility (HeadBucket)...');
    await headBucket(S3_BUCKET_NAME);
    console.log('headBucket succeeded — bucket exists and is reachable.');
  } catch (err) {
    console.error('headBucket failed.');
    console.error('  error.code =', err && err.code);
    console.error('  error.name =', err && err.name);
    console.error('  message =', err && (err.message || err));
    process.exit(2);
  }

  if (!fs.existsSync(UPLOADS_DIR)) {
    console.error('ERROR: Uploads folder not found:', UPLOADS_DIR);
    process.exit(3);
  }

  const files = fs.readdirSync(UPLOADS_DIR).filter(f => !f.startsWith('.'));
  console.log('Found files to process:', files.length);

  // Connect to MongoDB
  await mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
  const col = mongoose.connection.collection('products');

  const report = { uploaded: [], updated: [], skipped: [], errors: [] };

  for (const filename of files) {
    const localPath = path.join(UPLOADS_DIR, filename);
    try {
      const stat = fs.statSync(localPath);
      if (!stat.isFile()) {
        console.log('Skipping non-file:', filename);
        report.skipped.push({ file: filename, reason: 'not-a-file' });
        continue;
      }

      console.log('Processing file:', filename);

      // Upload
      let s3Url;
      if (DRY) {
        s3Url = `[DRY] products/${filename}`;
        console.log('[DRY] would upload:', filename);
      } else {
        console.log('Uploading to S3...');
        await uploadFileToS3(filename);
        s3Url = (S3_BASE_URL && !S3_BASE_URL.includes(S3_BUCKET_NAME))
          ? `${S3_BASE_URL.replace(/\/$/, '')}/${S3_BUCKET_NAME}/${encodeURIComponent(`products/${filename}`)}`
          : (S3_BASE_URL ? `${S3_BASE_URL.replace(/\/$/, '')}/${encodeURIComponent(`products/${filename}`)}` : `https://${S3_BUCKET_NAME}.s3.${REGION}.amazonaws.com/${encodeURIComponent(`products/${filename}`)}`);
        console.log('Uploaded:', s3Url);
      }
      report.uploaded.push({ file: filename, url: s3Url });

      // Prepare regexes to match existing references (exact file suffix)
      const regex1 = new RegExp(`/uploads/${escapeRegex(filename)}$`, 'i'); // e.g. /uploads/abc.jpg
      const regex2 = new RegExp(`api\\.seemati\\.in/uploads/${escapeRegex(filename)}$`, 'i'); // full url pattern

      // Find docs that reference the uploads path
      const cursor = col.find({
        $or: [
          { thumbnail: { $regex: regex1 } },
          { thumbnail: { $regex: regex2 } },
          { images: { $elemMatch: { $regex: regex1 } } },
          { images: { $elemMatch: { $regex: regex2 } } },
        ],
      });

      while (await cursor.hasNext()) {
        const doc = await cursor.next();
        let updated = false;
        const updates = {};

        // thumbnail
        if (doc.thumbnail && (regex1.test(doc.thumbnail) || regex2.test(doc.thumbnail))) {
          updates.thumbnail = s3Url;
          updated = true;
        }

        // images array
        if (Array.isArray(doc.images) && doc.images.length) {
          const newImages = doc.images.map(img => {
            if (!img) return img;
            if (typeof img === 'string') {
              if (regex1.test(img) || regex2.test(img)) {
                updated = true;
                return s3Url;
              }
              return img;
            }
            if (typeof img === 'object') {
              if (img.url && (regex1.test(img.url) || regex2.test(img.url))) {
                updated = true;
                return { ...img, url: s3Url };
              }
              return img;
            }
            return img;
          });
          if (updated) updates.images = newImages;
        }

        if (updated) {
          if (DRY) {
            console.log('[DRY] would update doc', doc._id.toString(), updates);
          } else {
            await col.updateOne({ _id: doc._id }, { $set: updates });
            console.log('Updated doc', doc._id.toString());
          }
          report.updated.push({ _id: doc._id.toString(), updates });
        } else {
          report.skipped.push({ _id: doc._id.toString() });
        }
      }
    } catch (err) {
      console.error('Error processing file', filename, err && (err.message || err));
      report.errors.push({ file: filename, error: (err && err.message) || String(err) });
      // continue with other files
    }
  }

  // Write report
  const outPath = path.join(__dirname, 'migrate-report.json');
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2));
  console.log('Report written to', outPath);

  // Cleanup and exit
  await mongoose.disconnect();
  console.log('--- migrate-uploads-to-s3: done ---');
}

main().catch(err => {
  console.error('Fatal error:', err && (err.message || err));
  process.exit(1);
});
