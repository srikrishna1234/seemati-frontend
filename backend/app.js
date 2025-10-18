// backend/app.js
// Full replacement — simple bootstrap that loads env then starts app.cjs (CommonJS)
'use strict';

const path = require('path');

try {
  // Load any environment in backend/.env first (if present)
  try {
    require('dotenv').config({ path: path.join(__dirname, '.env') });
  } catch (e) {
    // dotenv optional
  }

  // Prefer to load app.cjs (CommonJS entry). If missing, try app.cjs in same dir.
  const entry = path.join(__dirname, 'app.cjs');
  console.log(`[bootstrap] Loading CommonJS entry: ${entry}`);
  require(entry);
} catch (err) {
  console.error('[bootstrap] Fatal error starting backend:', err && (err.stack || err));
  // Non-zero exit ensures CI/host notices failure
  process.exit(1);
}
