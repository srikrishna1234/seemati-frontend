// backend/app.js (ESM bootstrap that loads the CommonJS app.cjs)
// Replace the entire file content with this to remove merge markers and safely require app.cjs

import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

try {
  const entry = path.join(__dirname, 'app.cjs');
  console.log(`[bootstrap] Loading CommonJS entry: ${entry}`);
  require(entry);
} catch (err) {
  console.error('[bootstrap] Failed to load backend/app.cjs:', err && err.stack ? err.stack : err);
  // exit non-zero to make deploy fail loud if something else is wrong
  process.exit(1);
}
