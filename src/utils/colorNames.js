// src/utils/colorNames.js
// Small utility to map hex colors to friendly names.
// - Exact match uses the dictionary
// - Fallback finds the nearest named color via RGB distance

const NAMED = {
  "#000000": "black",
  "#FFFFFF": "white",
  "#FF0000": "red",
  "#00FF00": "lime",
  "#0000FF": "blue",
  "#FFFF00": "yellow",
  "#00FFFF": "cyan",
  "#FF00FF": "magenta",
  "#C0C0C0": "silver",
  "#808080": "gray",
  "#800000": "maroon",
  "#808000": "olive",
  "#008000": "green",
  "#800080": "purple",
  "#008080": "teal",
  "#000080": "navy",
  "#F5F5DC": "beige",
  "#FFC0CB": "pink",
  "#FFA500": "orange",
  "#A52A2A": "brown",
  // common brand / UI colors used on site — add more for better matches
  "#1026CB": "blue",
  "#1A84C7": "teal",
  "#E40C0C": "red",
  "#010913": "black",
  "#FFDDEE": "light pink",
  "#F6F6F6": "off white",
  "#333333": "dark gray",
  "#4CAF50": "green",
  "#FFEB3B": "yellow",
  "#9C27B0": "purple",
  "#3F51B5": "indigo"
};

// normalize hex: accepts '#abc' or 'abc' and returns uppercase 6-digit '#RRGGBB'
function normalizeHex(input) {
  if (!input) return null;
  let s = String(input).trim();
  if (!s.length) return null;
  if (s[0] !== "#") s = "#" + s;
  s = s.toUpperCase();
  // short form #ABC
  if (s.length === 4) {
    const a = s[1], b = s[2], c = s[3];
    s = `#${a}${a}${b}${b}${c}${c}`;
  }
  if (/^#[0-9A-F]{6}$/.test(s)) return s;
  return null;
}

function hexToRgb(hex) {
  const h = normalizeHex(hex);
  if (!h) return null;
  const r = parseInt(h.slice(1, 3), 16);
  const g = parseInt(h.slice(3, 5), 16);
  const b = parseInt(h.slice(5, 7), 16);
  return { r, g, b };
}

function distanceSq(a, b) {
  return (a.r - b.r) ** 2 + (a.g - b.g) ** 2 + (a.b - b.b) ** 2;
}

// Try exact dictionary match, else nearest named color
export function hexToName(hex) {
  const h = normalizeHex(hex);
  if (!h) return null;
  if (NAMED[h]) return NAMED[h];

  // compute nearest
  const target = hexToRgb(h);
  if (!target) return h; // fallback show hex
  let bestName = h;
  let bestDist = Infinity;
  for (const [k, name] of Object.entries(NAMED)) {
    const rgb = hexToRgb(k);
    const d = distanceSq(target, rgb);
    if (d < bestDist) {
      bestDist = d;
      bestName = name || k;
    }
  }
  return bestName || h;
}

// exports convenience: formatColor for showing (e.g. "Blue (#1026CB)")
export function formatColorName(hex) {
  const name = hexToName(hex);
  const h = normalizeHex(hex);
  if (!h) return name || "";
  // if name is same as hex or is a hex-like then just return hex
  if (!name || name.toUpperCase().startsWith("#")) return h;
  return `${name} (${h})`;
}

export default {
  hexToName,
  formatColorName,
  normalizeHex
};
