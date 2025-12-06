// backend/src/utils/slugify.js
// Simple slug generator: normalizes, strips diacritics, removes invalid chars, collapses dashes

function slugify(str) {
  if (!str) return '';
  return String(str)
    .trim()
    .toLowerCase()
    .normalize('NFKD')                      // decompose accented characters
    .replace(/[\u0300-\u036f]/g, '')       // remove combining diacritical marks
    .replace(/[^a-z0-9\- ]+/g, '')         // remove invalid chars
    .replace(/\s+/g, '-')                  // spaces => dash
    .replace(/\-+/g, '-')                  // collapse multiple dashes
    .replace(/^\-+|\-+$/g, '');            // trim leading/trailing dashes
}

module.exports = slugify;
