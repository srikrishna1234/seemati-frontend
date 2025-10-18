// backend/app.js
// Full replacement — minimal bootstrap that loads env and starts app.cjs
'use strict';

const path = require('path');

(function bootstrap() {
  try {
    // Load dotenv from backend/.env if present (non-fatal)
    try {
      require('dotenv').config({ path: path.join(__dirname, '.env') });
    } catch (e) {
      // optional; ignore if missing
    }

    // Prefer to load app.cjs (CommonJS server entry). If app.cjs missing, try app.js fallback.
    const candidates = [
      path.join(__dirname, 'app.cjs'),
      path.join(__dirname, 'app.js'), // fallback only if app.cjs absent
    ];

    let loaded = false;
    for (const entry of candidates) {
      try {
        // Only require the first existing file that's not this wrapper
        const fs = require('fs');
        if (fs.existsSync(entry) && path.resolve(entry) !== __filename) {
          console.log(`[bootstrap] Loading CommonJS entry: ${entry}`);
          require(entry);
          loaded = true;
          break;
        }
      } catch (e) {
        // try next candidate
      }
    }

    if (!loaded) {
      // Last-resort: try requiring './src/server.js' if project uses ESM transpile or hybrid setups.
      try {
        const alt = path.join(__dirname, 'src', 'server.js');
        console.log(`[bootstrap] Trying fallback entry: ${alt}`);
        require(alt);
        loaded = true;
      } catch (e) {
        // ignore
      }
    }

    if (!loaded) {
      console.error('[bootstrap] No server entry found (app.cjs / app.js / src/server.js). Exiting.');
      process.exit(1);
    }
  } catch (err) {
    console.error('[bootstrap] Fatal error starting backend:', err && (err.stack || err));
    process.exit(1);
  }
})();
