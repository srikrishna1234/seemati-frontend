// backend/app.js
// Clean bootstrap loader: Always load backend/app.cjs
'use strict';

const path = require('path');

(async () => {
  try {
    const entry = path.join(__dirname, 'app.cjs');
    console.log(`[bootstrap] Loading CommonJS entry: ${entry}`);
    require(entry);
  } catch (err) {
    console.error('[bootstrap] Failed to load app.cjs:', err);
    process.exit(1);
  }
})();
