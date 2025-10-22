'use strict';

// ESM bootstrap that loads the CommonJS server entry (app.cjs).
// - Loads dotenv if present in backend/.env (non-fatal).
// - Prefer app.cjs; fall back to app.js (only if app.cjs missing).
// - Exits with non-zero status if no entry is found or load fails.
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

(function bootstrap() {
  try {
    // Load dotenv from backend/.env if present (optional)
    try {
      const dotenvPath = path.join(__dirname, '.env');
      if (require('fs').existsSync(dotenvPath)) {
        require('dotenv').config({ path: dotenvPath });
      }
    } catch (err) {
      // ignore: dotenv optional
    }

    // Candidate server entries to try (prefer CommonJS app.cjs)
    const candidates = [
      path.join(__dirname, 'app.cjs'),
      path.join(__dirname, 'app.js'),
    ];

    let entry = null;
    const fs = require('fs');
    for (const candidate of candidates) {
      try {
        if (fs.existsSync(candidate)) {
          entry = candidate;
          break;
        }
      } catch (e) {
        // continue
      }
    }

    if (!entry) {
      console.error('[bootstrap] No server entry found. Looked for app.cjs and app.js in', __dirname);
      process.exit(1);
    }

    console.log(`[bootstrap] Loading CommonJS entry: ${entry}`);
    require(entry);
  } catch (err) {
    console.error('[bootstrap] Failed to load backend server entry:', err && err.stack ? err.stack : err);
    process.exit(1);
  }
})();
