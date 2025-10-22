// backend/src/server.js
// Minimal robust server entry (CommonJS style compatible) — safe fallback for rebase resolution
'use strict';

const express = require('express');
const cors = require('cors');
const session = require('express-session');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const dotenv = require('dotenv');
const mongoose = (() => { try { return require('mongoose'); } catch (e) { return null; } })();

dotenv.config();

const PORT = process.env.PORT || 4000;
const FRONTEND_ORIGIN = (process.env.FRONTEND_ORIGIN || '').trim();
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || null;

function canonicalizeOrigin(raw) {
  if (!raw) return raw;
  try { const u = new URL(String(raw).trim()); return u.origin; } catch (e) { return String(raw).trim().replace(/\/+$/, '').toLowerCase(); }
}

async function connectMongo() {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI || null;
  if (!mongoose) {
    console.warn('mongoose not installed; skipping Mongo connect.');
    return;
  }
  if (!uri) {
    console.warn('MONGODB_URI not set — skipping mongo connect');
    return;
  }
  try {
    await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log('✅ MongoDB connected (backend/src/server.js)');
  } catch (e) {
    console.error('Mongo connect failed:', e && e.stack ? e.stack : e);
  }
}

async function main() {
  await connectMongo();
  const app = express();

  // CORS allowed list
  const allowed = new Set();
  if (FRONTEND_ORIGIN) allowed.add(canonicalizeOrigin(FRONTEND_ORIGIN));
  allowed.add(canonicalizeOrigin('http://localhost:3000'));
  allowed.add(canonicalizeOrigin('http://127.0.0.1:3000'));
  const extras = process.env.CORS_ALLOWED_ORIGINS || process.env.ALLOWED_ORIGINS || '';
  if (extras) extras.split(',').map(s => s.trim()).filter(Boolean).forEach(s => allowed.add(canonicalizeOrigin(s)));

  const corsOptions = {
    origin: function (incoming, cb) {
      if (!incoming) return cb(null, true);
      const norm = canonicalizeOrigin(incoming);
      if (allowed.has(norm)) return cb(null, true);
      return cb(new Error(`CORS: ${incoming} not allowed`), false);
    },
    credentials: true,
    optionsSuccessStatus: 204
  };

  app.use(cors(corsOptions));
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // session (development safe)
  app.use(session({ secret: process.env.SESSION_SECRET || 'keyboard_cat_dev_secret', resave: false, saveUninitialized: false, cookie: { secure: false } }));

  // uploads
  const uploadDir = path.join(__dirname, '..', '..', 'uploads');
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
  app.use('/uploads', express.static(uploadDir));

  // simple admin upload route (disk)
  const storage = multer.diskStorage({ destination: (req, file, cb) => cb(null, uploadDir), filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname.replace(/\s+/g,'-')}`) });
  const upload = multer({ storage });
  app.post('/admin-api/products/upload', upload.any(), (req, res) => {
    const files = req.files || [];
    const host = process.env.SERVER_URL || `http://localhost:${PORT}`;
    const out = files.map(f => ({ filename: f.filename, url: `${host}/uploads/${f.filename}`, size: f.size }));
    return res.json(out);
  });

  app.get('/api/ping', (req, res) => res.json({ ok: true, msg: 'api ping' }));
  app.get('/_health', (req, res) => res.json({ ok: true, uptime: process.uptime() }));

  app.listen(PORT, () => console.log(`Backend server listening on http://localhost:${PORT}`));
}

main().catch(e => { console.error('Fatal (server.js):', e && (e.stack || e)); process.exit(1); });
