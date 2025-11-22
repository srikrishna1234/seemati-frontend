// backend/jobs/cleanupDeletedImages.js
// Scans products for images marked `deleted: true` older than the grace period
// and permanently deletes the file (via utils/storage.deleteFile) and removes
// the image subdoc from the product.

const Product = require('../../models/Product'); // path relative to backend/jobs
const { deleteFile } = require('../../utils/storage');

const GRACE_HOURS = parseInt(process.env.DELETE_GRACE_HOURS || '24', 10); // default 24 hours
const BATCH_LIMIT = parseInt(process.env.CLEANUP_BATCH_LIMIT || '100', 10); // how many products per run

async function cleanupDeletedImages() {
  try {
    const cutoff = new Date(Date.now() - GRACE_HOURS * 3600 * 1000);
    console.log(`[cleanupDeletedImages] running - removing images deleted before ${cutoff.toISOString()}`);

    // Find products that have images marked deleted older than cutoff
    const products = await Product.find(
      { 'images.deleted': true, 'images.deletedAt': { $lte: cutoff } },
      null,
      { limit: BATCH_LIMIT }
    );

    if (!products || products.length === 0) {
      console.log('[cleanupDeletedImages] no candidates found.');
      return;
    }

    for (const prod of products) {
      let changed = false;
      // iterate over a copy of images to avoid mutation issues
      const imgs = Array.from(prod.images || []);
      for (const img of imgs) {
        if (img.deleted && img.deletedAt && img.deletedAt <= cutoff) {
          try {
            const key = (img.filename && String(img.filename)) || (img.url ? require('path').basename(String(img.url)) : null);
            if (key) {
              await deleteFile(key);
            } else {
              console.warn('[cleanupDeletedImages] no filename/key available for image', img._id);
            }
            // remove subdoc
            prod.images.id(img._id).remove();
            changed = true;
            console.log(`[cleanupDeletedImages] permanently removed image ${img._id} from product ${prod._id}`);
          } catch (err) {
            // log and continue — we'll retry on next run
            console.error(`[cleanupDeletedImages] error removing image ${img._id} from product ${prod._id}:`, err);
          }
        }
      }
      if (changed) {
        try {
          await prod.save();
        } catch (err) {
          console.error('[cleanupDeletedImages] failed saving product after removals', prod._id, err);
        }
      }
    }

    console.log(`[cleanupDeletedImages] finished; processed ${products.length} product(s).`);
  } catch (err) {
    console.error('[cleanupDeletedImages] unexpected error:', err);
  }
}

module.exports = cleanupDeletedImages;
