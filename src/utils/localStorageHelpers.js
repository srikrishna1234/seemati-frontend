// src/utils/localStorageHelpers.js
// Small helper for cart & wishlist stored locally in localStorage.
// Keeps keys consistent and returns simple summaries.

const CART_KEY = "cart";
const WISHLIST_KEY = "wishlist";

function _read(key) {
  try {
    const raw = localStorage.getItem(key) || "[]";
    return JSON.parse(raw);
  } catch (e) {
    console.error("localStorage read error", e);
    return [];
  }
}

function _write(key, val) {
  try {
    localStorage.setItem(key, JSON.stringify(val || []));
    return true;
  } catch (e) {
    console.error("localStorage write error", e);
    return false;
  }
}

export function getCart() {
  return _read(CART_KEY);
}

export function addToCartEntry(entry) {
  try {
    const cur = _read(CART_KEY);
    cur.push(entry);
    const ok = _write(CART_KEY, cur);
    if (ok) localStorage.setItem("cart-refresh-ts", String(Date.now()));
    return ok;
  } catch (e) {
    console.error("addToCartEntry error", e);
    return false;
  }
}

export function clearCart() {
  return _write(CART_KEY, []);
}

export function getWishlist() {
  return _read(WISHLIST_KEY);
}

export function saveForLaterEntry(entry) {
  try {
    const cur = _read(WISHLIST_KEY);
    // don't add duplicate by productId
    const id = entry.productId || entry.id;
    if (cur.some((x) => x && (x.productId === id || x.id === id))) return false;
    cur.push(entry);
    return _write(WISHLIST_KEY, cur);
  } catch (e) {
    console.error("saveForLaterEntry error", e);
    return false;
  }
}

export function removeFromWishlist(productId) {
  try {
    const cur = _read(WISHLIST_KEY).filter((x) => !(x && (x.productId === productId || x.id === productId)));
    return _write(WISHLIST_KEY, cur);
  } catch (e) {
    console.error("removeFromWishlist error", e);
    return false;
  }
}
