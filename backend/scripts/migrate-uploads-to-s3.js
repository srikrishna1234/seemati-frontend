// backend/scripts/migrate-uploads-to-s3.js
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

const DRY = process.argv.includes('--dry');
const UPLOADS_DIR = path.join(__dirname, '..', 'uploads'); // adjust if different
const MONGO_URI = process.env.MONGO_URI;
const BUCKET = process.env.S3_BUCKET_NAME;
const REGION = process.env.AWS_REGION || 'ap-south-1';
const S3_BASE = process.env.S3_BASE_URL || `https://${BUCKET}.s3.${REGION}.amazonaws.com`;

if (!MONGO_URI) {
  console.error('Set MONGO_URI env var before running.');
  process.exit(1);
}
if (!BUCKET) {
  console.error('Set S3_BUCKET_NAME env var before running.');
  process.exit(1);
}

async function uploadFileToS3(filename) {
  const client = new S3Client({ region: REGION });
  const key = `products/${filename}`;
  const filepath = path.join(UPLOADS_DIR, filename);
  const body = fs.readFileSync(filepath);
  const params = {
    Bucket: BUCKET,
    Key: key,
    Body: body,
    ContentType: mimeTypeFromFilename(filename),
    ACL: 'public-read'
  };
  await client.send(new PutObjectCommand(params));
  return `${S3_BASE}/${encodeURIComponent(key)}`;
}

function mimeTypeFromFilename(name) {
  const ext = (path.extname(name) || '').toLowerCase();
  if (ext === '.png') return 'image/png';
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  if (ext === '.gif') return 'image/gif';
  if (ext === '.svg') return 'image/svg+xml';
  return 'application/octet-stream';
}

async function main() {
  await mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
  const col = mongoose.connection.collection('products');

  if (!fs.existsSync(UPLOADS_DIR)) {
    console.error('Uploads dir not found:', UPLOADS_DIR);
    process.exit(1);
  }

  const files = fs.readdirSync(UPLOADS_DIR).filter(f => !f.startsWith('.'));
  console.log('Found files:', files.length);

  const report = { uploaded: [], updated: [], skipped: [], errors: [] };

  for (const f of files) {
    try {
      // Upload file to S3
      console.log('Uploading', f);
      const s3Url = await uploadFileToS3(f);
      console.log('Uploaded to', s3Url);
      report.uploaded.push({ file: f, url: s3Url });

      // Replace any product documents referencing /uploads/<file>
      const regex1 = new RegExp(`/uploads/${escapeRegex(f)}$`, 'i'); // exact
      const regex2 = new RegExp(`api\\.seemati\\.in/uploads/${escapeRegex(f)}$`, 'i');
      const cursor = col.find({
        $or: [
          { thumbnail: { $regex: regex1 } },
          { thumbnail: { $regex: regex2 } },
          { images: { $elemMatch: { $regex: regex1 } } },
          { images: { $elemMatch: { $regex: regex2 } } }
        ]
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
              // object with url property
              if (img.url && (regex1.test(img.url) || regex2.test(img.url))) {
                updated = true;
                return typeof img === 'object' ? { ...img, url: s3Url } : s3Url;
              }
              return img;
            }
            return img;
          });
          if (updated) updates.images = newImages;
        }

        if (updated) {
          if (!DRY) {
            await col.updateOne({ _id: doc._id }, { $set: updates });
            console.log('Updated doc', doc._id.toString());
          } else {
            console.log('[DRY] Would update', doc._id.toString(), updates);
          }
          report.updated.push({ _id: doc._id.toString(), updates });
        } else {
          report.skipped.push({ _id: doc._id.toString() });
        }
      }
    } catch (err) {
      console.error('Error with file', f, err);
      report.errors.push({ file: f, error: String(err) });
    }
  }

  const out = path.join(__dirname, 'migrate-report.json');
  fs.writeFileSync(out, JSON.stringify(report, null, 2));
  console.log('Report written:', out);
  await mongoose.disconnect();
  console.log('Done.');
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

main().catch(err => {
  console.error('Fatal error', err);
  process.exit(1);
});
