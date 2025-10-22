// src/utils/imageUtils.js
// Helpers to turn backend image fields into usable absolute URLs.

// Prefer REACT_APP_API_URL (used elsewhere in your project).
const ENV_BASE = process.env.REACT_APP_API_URL || process.env.REACT_APP_API_BASE_URL || "http://localhost:4000";
const BASE = String(ENV_BASE).replace(/\/+$/, ""); // remove trailing slash

export function getImageUrl(imgOrUrl) {
  if (!imgOrUrl) return `${BASE}/uploads/placeholder.png`;

  const raw = typeof imgOrUrl === "string"
    ? imgOrUrl
    : imgOrUrl.url || imgOrUrl.path || imgOrUrl.filename || "";

  if (!raw) return `${BASE}/uploads/placeholder.png`;

  if (/^https?:\/\//i.test(raw) || /^\/\//.test(raw)) return raw;
  if (raw.startsWith("/")) return `${BASE}${raw}`;
  return `${BASE}/uploads/${raw}`;
}

export function getImageUrls(images) {
  if (!Array.isArray(images)) return [];
  const seen = new Set();
  const out = [];
  for (const it of images) {
    try {
      const url = getImageUrl(it);
      if (!url) continue;
      if (seen.has(url)) continue;
      seen.add(url);
      out.push(url);
    } catch (e) {
      continue;
    }
  }
  return out;
}
