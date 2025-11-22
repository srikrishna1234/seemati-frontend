// backend/utils/storage.js
const fs = require('fs');
const path = require('path');

// Toggle if later you want to use S3 (for now = false)
const USE_S3 = process.env.USE_S3 === 'true';

// --- Optional S3 Setup (leave unused for now) ---
let s3 = null;
if (USE_S3) {
  const AWS = require('aws-sdk');
  s3 = new AWS.S3({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION
  });
}

/**
 * Delete a file from local disk or S3.
 * @param {string} keyOrPath - filename (for local) or S3 key
 */
async function deleteFile(keyOrPath) {
  if (!keyOrPath) return;

  if (USE_S3) {
    // --- Delete from AWS S3 ---
    const params = {
      Bucket: process.env.S3_BUCKET,
      Key: keyOrPath
    };
    return s3.deleteObject(params).promise();
  } else {
    // --- Delete from local uploads/images directory ---
    // Ensure only safe paths inside /public/images
    const IMAGES_DIR = path.join(__dirname, '..', 'public', 'images');
    const fileNameOnly = path.basename(keyOrPath); // strip any ../ attempts
    const absPath = path.join(IMAGES_DIR, fileNameOnly);

    const resolved = path.resolve(absPath);
    if (!resolved.startsWith(path.resolve(IMAGES_DIR))) {
      console.warn('Refusing to delete file outside images dir:', resolved);
      return;
    }

    return new Promise((resolve, reject) => {
      fs.unlink(resolved, (err) => {
        if (err && err.code !== 'ENOENT') {
          return reject(err);
        }
        console.log('Deleted local file:', resolved);
        resolve();
      });
    });
  }
}

module.exports = { deleteFile };
