// src/utils/imageUtils.js
export function getImageUrl(imgOrUrl) {
  const BASE = process.env.REACT_APP_API_URL || "http://localhost:4000";
  if (!imgOrUrl) return `${BASE}/uploads/placeholder.png`;

  const raw = typeof imgOrUrl === "string"
    ? imgOrUrl
    : imgOrUrl.url || imgOrUrl.path || imgOrUrl.filename || "";

  if (!raw) return `${BASE}/uploads/placeholder.png`;

  if (raw.startsWith("http://") || raw.startsWith("https://") || raw.startsWith("//")) return raw;
  if (raw.startsWith("/")) return `${BASE}${raw}`;
  return `${BASE}/uploads/${raw}`;
}

/**
 * Accepts an images field (array of strings or objects) and returns an array
 * of usable absolute image URLs (filtered, unique).
 *
 * Example supported item shapes:
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
