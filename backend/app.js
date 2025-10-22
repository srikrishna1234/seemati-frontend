// backend/app.js
// Minimal bootstrap that loads env and starts app.cjs (robust for merges)
'use strict';

const path = require('path');

(function bootstrap() {
  try {
    // load dotenv from backend/.env if present (non-fatal)
    try { require('dotenv').config({ path: path.join(__dirname, '.env') }); } catch (e) {}

    // prefer app.cjs, fallback to app.js (if someone used that), then src/server.js
    const fs = require('fs');
    const candidates = [
      path.join(__dirname, 'app.cjs'),
      path.join(__dirname, 'app.js'),
      path.join(__dirname, 'src', 'server.js'),
    ];

    for (const candidate of candidates) {
      try {
        if (fs.existsSync(candidate) && path.resolve(candidate) !== __filename) {
          console.log(`[bootstrap] Loading entry: ${candidate}`);
          require(candidate);
          return;
        }
      } catch (e) {
        // try next candidate
      }
    }

    console.error('[bootstrap] No server entry found (app.cjs / app.js / src/server.js). Exiting.');
    process.exit(1);
  } catch (err) {
    console.error('[bootstrap] Fatal error starting backend:', err && (err.stack || err));
    process.exit(1);
  }
})();
