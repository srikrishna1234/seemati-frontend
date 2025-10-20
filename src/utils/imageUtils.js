// src/utils/imageUtils.js
// Helpers to turn backend image fields into usable absolute URLs.

const ENV_BASE = process.env.REACT_APP_API_BASE_URL || "http://localhost:4000";
const BASE = String(ENV_BASE).replace(/\/+$/, ""); // remove trailing slash

export function getImageUrl(imgOrUrl) {
  // return placeholder when nothing useful provided
  if (!imgOrUrl) return `${BASE}/uploads/placeholder.png`;

  const raw = typeof imgOrUrl === "string"
    ? imgOrUrl
    : imgOrUrl.url || imgOrUrl.path || imgOrUrl.filename || "";

  if (!raw) return `${BASE}/uploads/placeholder.png`;

  // already absolute (http(s) or protocol-relative)
  if (/^https?:\/\//i.test(raw) || /^\/\//.test(raw)) return raw;

  // starts with single slash -> join to base
  if (raw.startsWith("/")) return `${BASE}${raw}`;

  // otherwise assume filename under /uploads/
  return `${BASE}/uploads/${raw}`;
}

/**
 * Accepts an images field (array of strings or objects) and returns an array
 * of usable absolute image URLs (filtered, unique).
 *
 * Supported item shapes:
 * - "/uploads/1.jpg"
 * - "http://.../1.jpg"
 * - { url: "/uploads/1.jpg" }
 * - { filename: "1.jpg" }
 */
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
      // ignore invalid item
      continue;
    }
  }
  return out;
}
