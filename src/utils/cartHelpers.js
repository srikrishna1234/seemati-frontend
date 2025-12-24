// src/utils/cartHelpers.js
// Centralized cart helpers — normalize ids, persist as { items: [...] }, and emit `cart-updated`.

export const CART_KEY = "seemati_cart_v1";
export const SHIPPING_THRESHOLD = 999;
const DEFAULT_SHIPPING = 60;

function safeParse(raw) {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

// Always return shape: { items: [ ... ] }
export function loadCart() {
  try {
    const raw = localStorage.getItem(CART_KEY);
    if (!raw) return { items: [] };
    const parsed = safeParse(raw);
    if (!parsed) return { items: [] };
    // Accept either array or object form
    if (Array.isArray(parsed)) return { items: parsed };
    if (parsed.items && Array.isArray(parsed.items)) return parsed;
    // fallback: unknown shape -> attempt to find array value
    for (const k of Object.keys(parsed)) {
      if (Array.isArray(parsed[k])) return { items: parsed[k] };
    }
    return { items: [] };
  } catch (e) {
    console.error("[cartHelpers] loadCart error", e);
    return { items: [] };
  }
}

export function saveCart(cartObj) {
  try {
    const normalized = Array.isArray(cartObj) ? { items: cartObj } : (cartObj && cartObj.items ? { items: cartObj.items } : { items: [] });
    localStorage.setItem(CART_KEY, JSON.stringify(normalized));
    // Note: we save as array to be tolerant with older code that expects an array in storage.
    // Also emit event to notify UI listeners.
    try { window.dispatchEvent(new Event("cart-updated")); } catch (e) {}
    return normalized;
  } catch (e) {
    console.error("[cartHelpers] saveCart error", e);
    return { items: [] };
  }
}

function normalizeId(item) {
  return item.productId ?? item._id ?? item.id ?? item.slug ?? String(item.title ?? Math.random().toString(36).slice(2,9));
}

function normalizeItemShape(item) {
  const pid = normalizeId(item);
  return {
    productId: pid,
    _id: item._id ?? pid,
    id: item.id ?? pid,
    slug: item.slug ?? undefined,
    title: item.title ?? item.name ?? "Product",
    price: Number(item.price ?? item.salePrice ?? item.amount ?? 0),
    image: item.image ?? (item.images && item.images[0] && (item.images[0].url || item.images[0])) ?? null,
    images: item.images ?? (item.image ? [{ url: item.image }] : []),
    quantity: Math.max(1, Number(item.quantity ?? item.qty ?? 1)),
    // keep any extra fields if present
    ...Object.keys(item).reduce((acc, k) => {
      if (!["productId","_id","id","slug","title","price","image","images","quantity"].includes(k)) acc[k] = item[k];
      return acc;
    }, {})
  };
}

export function computeTotals(cartLike) {
  const obj = Array.isArray(cartLike) ? { items: cartLike } : (cartLike || { items: [] });
  const items = obj.items || [];
  const subtotal = items.reduce((s, it) => s + (Number(it.price || 0) * Number(it.quantity || it.qty || 0)), 0);
  const shipping = subtotal >= SHIPPING_THRESHOLD ? 0 : DEFAULT_SHIPPING;
  const tax = Math.round(subtotal * 0.05); // example tax
  const discount = 0;
  const total = subtotal + shipping + tax - discount;
  return { items, subtotal, shipping, tax, discount, total };
}

/**
 * Add item (or increment existing). Returns the normalized cart { items: [...] }.
 * item: object with at least id/title/price. qtyOrDelta: number to add (default 1)
 */
export function addOrIncrementItem(item, qtyOrDelta = 1) {
  try {
    const cart = loadCart();
    const items = Array.isArray(cart.items) ? [...cart.items] : [];
    const incoming = normalizeItemShape(item);
    const productId = incoming.productId;
    const idx = items.findIndex(i => (i.productId ?? i._id ?? i.id ?? i.slug) === productId);
    if (idx > -1) {
      const existing = { ...items[idx] };
      existing.quantity = Math.min(99, (Number(existing.quantity || existing.qty || 0) + Number(qtyOrDelta || 1)));
      items[idx] = existing;
    } else {
      incoming.quantity = Math.max(1, Number(qtyOrDelta || incoming.quantity || 1));
      items.push(incoming);
    }
    const saved = saveCart(items);
    return saved;
  } catch (e) {
    console.error("[cartHelpers] addOrIncrementItem error", e);
    return loadCart();
  }
}

export function setItemQuantity(productId, quantity) {
  try {
    const cart = loadCart();
    const items = (cart.items || []).map(i => {
      const id = i.productId ?? i._id ?? i.id ?? i.slug;
      if (id === productId) {
        return { ...i, quantity: Math.max(0, Math.floor(Number(quantity) || 0)) };
      }
      return i;
    }).filter(i => Number(i.quantity || 0) > 0); // remove zero qty
    const saved = saveCart(items);
    return saved;
  } catch (e) {
    console.error("[cartHelpers] setItemQuantity error", e);
    return loadCart();
  }
}

export function removeItem(productId) {
  try {
    const cart = loadCart();
    const items = (cart.items || []).filter(i => {
      const id = i.productId ?? i._id ?? i.id ?? i.slug;
      return id !== productId;
    });
    const saved = saveCart(items);
    return saved;
  } catch (e) {
    console.error("[cartHelpers] removeItem error", e);
    return loadCart();
  }
}

export function clearCart() {
  try {
    // 🔥 remove all legacy cart keys
    localStorage.removeItem("cart");
    localStorage.removeItem("cart_items");
    localStorage.removeItem("seemati_cart");
    localStorage.removeItem(CART_KEY);

    const empty = { items: [] };
    localStorage.setItem(CART_KEY, JSON.stringify(empty));

    try {
      window.dispatchEvent(new Event("cart-updated"));
    } catch (e) {}

    return empty;
  } catch (e) {
    console.error("[cartHelpers] clearCart error", e);
    return { items: [] };
  }
}

