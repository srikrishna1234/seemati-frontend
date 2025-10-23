// src/pages/ProductDetail.jsx
import React, { useEffect, useState, useRef, useCallback } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import axios from "../api/axiosInstance";
import { getImageUrl, getImageUrls } from "../utils/imageUtils";
import { addOrIncrementItem, loadCart, computeTotals, SHIPPING_THRESHOLD } from "../utils/cartHelpers";
import { useCartDispatch } from "../context/CartContext";

/* ---------- wishlist helpers (unchanged) ---------- */
const WISHLIST_KEY = "wishlist_v1";
function loadWishlist() {
  try {
    const raw = localStorage.getItem(WISHLIST_KEY) || "[]";
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}
function saveWishlist(arr) {
  try {
    localStorage.setItem(WISHLIST_KEY, JSON.stringify(arr));
    try { window.dispatchEvent(new Event("wishlist-updated")); } catch (e) {}
  } catch (e) {
    console.warn("saveWishlist failed", e);
  }
}

/* burst animation and image-zoom hooks unchanged (omitted for brevity in comment) */
/* copy the burstAt, checkAndTriggerBurst, useImageZoom helpers from your original file */
/* For brevity here: reuse the same functions you already had above in your original file. */

function burstAt(containerEl, options = {}) {
  if (!containerEl) containerEl = document.body;
  const { count = 20, spread = 160, lifetime = 900, colors = ["#f59e0b", "#ef4444", "#10b981", "#0b5cff", "#7c3aed"] } = options;

  const rect = containerEl.getBoundingClientRect();
  const wrapper = document.createElement("div");
  wrapper.style.position = "absolute";
  wrapper.style.left = `${rect.left + window.scrollX}px`;
  wrapper.style.top = `${rect.top + window.scrollY}px`;
  wrapper.style.width = `${rect.width}px`;
  wrapper.style.height = `${rect.height}px`;
  wrapper.style.pointerEvents = "none";
  wrapper.style.overflow = "visible";
  wrapper.style.zIndex = 9999;
  document.body.appendChild(wrapper);

  const cx = rect.width / 2;
  const cy = rect.height / 2;
  const particles = [];

  for (let i = 0; i < count; i++) {
    const el = document.createElement("div");
    const size = Math.floor(Math.random() * 8) + 6;
    el.style.position = "absolute";
    el.style.left = `${cx - size / 2}px`;
    el.style.top = `${cy - size / 2}px`;
    el.style.width = `${size}px`;
    el.style.height = `${size}px`;
    el.style.borderRadius = "4px";
    el.style.background = colors[Math.floor(Math.random() * colors.length)];
    el.style.opacity = "1";
    el.style.transform = "translate3d(0,0,0) scale(1)";
    el.style.willChange = "transform, opacity";
    wrapper.appendChild(el);

    const angle = Math.random() * Math.PI * 2;
    const speed = 2 + Math.random() * (spread / 30);
    const vx = Math.cos(angle) * speed;
    const vy = Math.sin(angle) * speed - Math.random() * 1.5;
    const rot = (Math.random() - 0.5) * 10;
    particles.push({ el, x: cx, y: cy, vx, vy, rot });
  }

  const start = performance.now();
  function frame(t) {
    const dt = t - start;
    const norm = Math.min(1, dt / lifetime);
    particles.forEach((p) => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.06;
      const scale = 1 - norm * 0.6;
      p.el.style.transform = `translate3d(${p.x - cx}px, ${p.y - cy}px, 0) rotate(${p.rot * norm}deg) scale(${Math.max(0.2, scale)})`;
      p.el.style.opacity = String(1 - norm);
    });
    if (norm < 1) requestAnimationFrame(frame);
    else setTimeout(() => { try { wrapper.remove(); } catch {} }, 60);
  }
  requestAnimationFrame(frame);
}

function checkAndTriggerBurst(subtotal, containerEl) {
  try {
    const KEY = "seemati_free_burst_done_v1";
    const done = localStorage.getItem(KEY) === "1";
    if (subtotal >= SHIPPING_THRESHOLD && !done) {
      burstAt(containerEl || document.body, { count: 30, spread: 220, lifetime: 1000 });
      localStorage.setItem(KEY, "1");
    } else if (subtotal < SHIPPING_THRESHOLD && done) {
      localStorage.removeItem(KEY);
    }
  } catch (e) {
    console.warn("burst check failed", e);
  }
}

function useImageZoom() {
  const imgRef = useRef(null);
  function onImgMouseMove(e) {
    const img = imgRef.current;
    if (!img) return;
    const rect = img.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const px = (x / rect.width) * 100;
    const py = (y / rect.height) * 100;
    img.style.transformOrigin = `${px}% ${py}%`;
  }
  function onImgEnter() {
    const img = imgRef.current;
    if (!img) return;
    img.style.transition = "transform 160ms cubic-bezier(.2,.9,.2,1)";
    img.style.transform = "scale(1.22)";
    img.style.willChange = "transform";
  }
  function onImgLeave() {
    const img = imgRef.current;
    if (!img) return;
    img.style.transform = "scale(1)";
    img.style.transition = "transform 260ms cubic-bezier(.2,.9,.2,1)";
    setTimeout(() => { if (img) img.style.willChange = ""; }, 300);
  }
  return { imgRef, onImgMouseMove, onImgEnter, onImgLeave };
}

/* ---------------- ProductDetail component ---------------- */
export default function ProductDetailPage({ products = [] }) {
  const { slug } = useParams();
  const navigate = useNavigate();
  const cartDispatch = useCartDispatch();

  const [product, setProduct] = useState(() => {
    try {
      if (Array.isArray(products) && products.length > 0) {
        return products.find((p) => p.slug === slug || p._id === slug || p.id === slug) ?? null;
      }
      return null;
    } catch {
      return null;
    }
  });

  const [loading, setLoading] = useState(product ? false : true);
  const [error, setError] = useState(null);
  const [adding, setAdding] = useState(false);
  const productImageContainerRef = useRef(null);

  const { imgRef, onImgMouseMove, onImgEnter, onImgLeave } = useImageZoom();

  // wishlist state
  const [saved, setSaved] = useState(false);

  // option selections
  const [selectedColor, setSelectedColor] = useState(null);
  const [selectedSize, setSelectedSize] = useState(null);
  const [quantity, setQuantity] = useState(1);

  // gallery state
  const [galleryUrls, setGalleryUrls] = useState([]); // array of resolved urls
  const [galleryIndex, setGalleryIndex] = useState(0);

  // load wishlist status and set defaults
  useEffect(() => {
    try {
      const arr = loadWishlist();
      const pid = product?._id ?? product?.id ?? product?.slug;
      setSaved(arr.some(i => (i.productId ?? i._id ?? i.id ?? i.slug) === pid));
    } catch {
      setSaved(false);
    }

    if (product) {
      if (Array.isArray(product.colors) && product.colors.length > 0) {
        setSelectedColor((prev) => prev ?? product.colors[0]);
      } else {
        setSelectedColor(null);
      }
      if (Array.isArray(product.sizes) && product.sizes.length > 0) {
        setSelectedSize((prev) => prev ?? product.sizes[0]);
      } else {
        setSelectedSize(null);
      }
      setQuantity(1);
    }
  }, [product?.slug, product?.colors, product?.sizes, product?._id, product?.id]);

  // fetch product if not present — use axios instance (backend baseURL)
  useEffect(() => {
    let mounted = true;
    async function fetchProduct() {
      if (product) {
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);

      // candidate endpoints on backend — call backend base via axios instance
      const endpoints = [
        `/products?slug=${encodeURIComponent(slug)}`,
        `/products/${encodeURIComponent(slug)}`,
      ];

      let lastError = null;
      for (const ep of endpoints) {
        try {
          const res = await axios.get(ep);
          if (!mounted) return;

          const data = res.data;
          let resolved = null;

          if (data) {
            if (Array.isArray(data)) {
              resolved = data.find(p => p.slug === slug || p._id === slug || p.id === slug) ?? data[0] ?? null;
            } else if (Array.isArray(data.products)) {
              resolved = data.products.find(p => p.slug === slug || p._id === slug || p.id === slug) ?? data.products[0] ?? null;
            } else if (data.product) {
              resolved = data.product;
            } else if (data._id || data.slug || data.id) {
              resolved = data;
            } else if (data.items && Array.isArray(data.items)) {
              resolved = data.items.find(p => p.slug === slug || p._id === slug || p.id === slug) ?? data.items[0] ?? null;
            }
          }

          if (resolved) { setProduct(resolved); setLoading(false); return; }
          lastError = `No product found in response from ${ep}`;
        } catch (err) {
          lastError = err.message || String(err);
          console.warn("[ProductDetail] fetch error", err);
        }
      }

      if (mounted) { setLoading(false); setProduct(null); setError(lastError || "Product not found."); }
    }

    fetchProduct();
    return () => { mounted = false; };
  }, [slug]);

  // Build gallery URLs whenever product.images (or product.image/thumbnail fallback) changes
  useEffect(() => {
    const imgs = Array.isArray(product?.images) ? [...product.images] : [];
    if ((imgs.length === 0) && product?.image) imgs.push(product.image);
    if ((imgs.length === 0) && product?.thumbnail) imgs.push(product.thumbnail);

    const urls = getImageUrls(imgs);
    setGalleryUrls(urls);
    setGalleryIndex(0);
  }, [product?.images, product?.image, product?.thumbnail, product?.slug, product?._id]);

  // floating shipping helper state
  const [cartTotals, setCartTotals] = useState(() => {
    try { const raw = loadCart(); return computeTotals(Array.isArray(raw) ? { items: raw } : raw); } catch { return computeTotals({ items: [] }); }
  });

  useEffect(() => {
    function onCartUpdated() {
      try { const raw = loadCart(); const comp = computeTotals(Array.isArray(raw) ? { items: raw } : raw); setCartTotals(comp); } catch (e) {}
    }
    window.addEventListener("cart-updated", onCartUpdated);
    onCartUpdated();
    return () => window.removeEventListener("cart-updated", onCartUpdated);
  }, []);

  // keyboard gallery navigation
  const onKey = useCallback((e) => {
    if (!galleryUrls || galleryUrls.length <= 1) return;
    if (e.key === "ArrowLeft") setGalleryIndex((i) => (i - 1 + galleryUrls.length) % galleryUrls.length);
    if (e.key === "ArrowRight") setGalleryIndex((i) => (i + 1) % galleryUrls.length);
  }, [galleryUrls]);

  useEffect(() => {
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onKey]);

  // wishlist toggle
  function toggleWishlist(e) {
    e?.preventDefault?.();
    if (!product) return;
    const pid = product._id ?? product.id ?? product.slug ?? null;
    if (!pid) return;
    const arr = loadWishlist();
    const exists = arr.find(i => (i.productId ?? i._id ?? i.id ?? i.slug) === pid);
    let next;
    if (exists) {
      next = arr.filter(i => (i.productId ?? i._id ?? i.id ?? i.slug) !== pid);
      saveWishlist(next);
      setSaved(false);
    } else {
      const payload = {
        productId: pid,
        _id: product._id ?? pid,
        id: product.id ?? pid,
        slug: product.slug ?? undefined,
        title: product.title,
        price: Number(product.price ?? 0),
        image: product.image ?? (product.images && product.images[0] && (product.images[0].url || product.images[0])) ?? null
      };
      next = [...arr, payload];
      saveWishlist(next);
      setSaved(true);
    }
  }

  function clampQty(q) {
    const n = Math.max(1, Math.floor(Number(q) || 1));
    if (product && typeof product.stock === "number") {
      return Math.min(n, Math.max(1, product.stock));
    }
    return n;
  }
  function incQty() { setQuantity((q) => clampQty(q + 1)); }
  function decQty() { setQuantity((q) => clampQty(q - 1)); }
  function onQtyChange(e) { setQuantity(clampQty(e.target.value)); }

  async function handleAddToCart(e) {
    e?.preventDefault?.();
    if (!product) return;
    if (Array.isArray(product.colors) && product.colors.length > 0 && !selectedColor) { setError("Please select a color."); return; }
    if (Array.isArray(product.sizes) && product.sizes.length > 0 && !selectedSize) { setError("Please select a size."); return; }

    setAdding(true);
    setError(null);

    const idBase = product._id ?? product.id ?? product.slug ?? Math.random().toString(36).slice(2, 9);
    const variantKeyParts = [idBase];
    if (selectedColor) variantKeyParts.push(`c:${String(selectedColor)}`);
    if (selectedSize) variantKeyParts.push(`s:${String(selectedSize)}`);
    const variantKey = variantKeyParts.join("|");

    const itemPayload = {
      _id: variantKey,
      productId: idBase,
      slug: product.slug,
      title: product.title ?? product.name ?? "Product",
      price: Number(product.price ?? product.salePrice ?? 0),
      images: product.images ?? (product.image ? [{ url: product.image }] : []),
      image: product.imageUrl ?? (product.images && product.images[0] ? (product.images[0].url || product.images[0]) : null),
      quantity: clampQty(quantity),
      meta: { color: selectedColor ?? null, size: selectedSize ?? null },
    };

    try {
      const saved = await addOrIncrementItem(itemPayload, itemPayload.quantity);
      try { if (typeof cartDispatch === "function") cartDispatch({ type: "INITIALIZE", payload: saved }); } catch (err) { console.warn("[ProductDetail] context initialize failed:", err); }
      try { window.dispatchEvent(new Event("cart-updated")); } catch (e) {}
      try { const comp = computeTotals(saved); checkAndTriggerBurst(comp.subtotal || 0, productImageContainerRef.current || document.body); } catch (e) {}
    } catch (err) {
      console.error("Add to cart failed (product page):", err);
      setError("Unable to add to cart. See console for details.");
    } finally {
      setAdding(false);
    }
  }

  const leftForFree = Math.max(0, (SHIPPING_THRESHOLD - (cartTotals.subtotal || 0)));

  if (loading) {
    return <div style={{ padding: 24 }}><p>Loading product…</p></div>;
  }

  if (!product) {
    return (
      <div style={{ padding: 24 }}>
        <p>Product not found.</p>
        <Link to="/shop">Back to shop</Link>
        {error ? <div style={{ color: "#b91c1c", marginTop: 12 }}>Error: {String(error)}</div> : null}
      </div>
    );
  }

  const fallbackSrc =
    product?.thumbnail ||
    (product?.images && product.images[0] && (product.images[0].url || product.images[0])) ||
    product?.image ||
    null;

  const mainImageSrc = galleryUrls.length > 0 ? galleryUrls[galleryIndex] : getImageUrl(fallbackSrc);

  return (
    <div style={{ padding: 24, position: "relative" }}>
      <button onClick={() => navigate(-1)} style={{ marginBottom: 12 }}>← Back</button>

      <div style={{ display: "flex", gap: 40 }}>
        <div style={{ flex: "0 0 520px" }}>
          <div
            ref={productImageContainerRef}
            style={{
              width: "100%",
              height: 520,
              borderRadius: 8,
              border: "1px solid #f3f3f3",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
              background: "#fff",
              position: "relative"
            }}
          >
            {galleryUrls.length > 1 && (
              <button
                onClick={() => setGalleryIndex((i) => (i - 1 + galleryUrls.length) % galleryUrls.length)}
                aria-label="Previous image"
                style={{
                  position: "absolute",
                  left: 8,
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "rgba(255,255,255,0.9)",
                  border: "none",
                  padding: 8,
                  borderRadius: 6,
                  cursor: "pointer",
                  zIndex: 5
                }}
              >◀</button>
            )}

            <img
              ref={imgRef}
              src={mainImageSrc}
              alt={product.title}
              onMouseMove={onImgMouseMove}
              onMouseEnter={onImgEnter}
              onMouseLeave={onImgLeave}
              style={{
                maxWidth: "100%",
                maxHeight: "100%",
                objectFit: "contain",
                display: "block",
                transition: "transform 180ms cubic-bezier(.2,.9,.2,1)",
                transform: "scale(1)",
              }}
              onError={(e) => { e.target.src = getImageUrl(null); }}
            />

            {galleryUrls.length > 1 && (
              <button
                onClick={() => setGalleryIndex((i) => (i + 1) % galleryUrls.length)}
                aria-label="Next image"
                style={{
                  position: "absolute",
                  right: 8,
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "rgba(255,255,255,0.9)",
                  border: "none",
                  padding: 8,
                  borderRadius: 6,
                  cursor: "pointer",
                  zIndex: 5
                }}
              >▶</button>
            )}
          </div>

          {galleryUrls.length > 1 && (
            <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
              {galleryUrls.map((u, i) => (
                <button
                  key={u + i}
                  onClick={() => setGalleryIndex(i)}
                  style={{
                    border: i === galleryIndex ? "2px solid #0b5cff" : "1px solid #eee",
                    padding: 0,
                    borderRadius: 6,
                    overflow: "hidden",
                    width: 76,
                    height: 76,
                    background: "#fff",
                    cursor: "pointer",
                  }}
                  aria-label={`Show image ${i + 1}`}
                >
                  <img src={u} alt={`${product.title}-${i}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                </button>
              ))}
            </div>
          )}

          {galleryUrls.length > 1 && <div style={{ marginTop: 8, color: "#6b7280", fontSize: 13 }}>{galleryIndex + 1} / {galleryUrls.length}</div>}
        </div>

        <div style={{ flex: "1 1 auto", maxWidth: 720 }}>
          <h1 style={{ marginTop: 0 }}>{product.title}</h1>
          {product.description && <p style={{ color: "#374151" }}>{product.description}</p>}

          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 14, color: "#6b7280", textDecoration: product.mrp > product.price ? "line-through" : "none" }}>
              MRP: ₹{Number(product.mrp ?? product.compareAtPrice ?? product.price ?? 0).toFixed(2)}
            </div>
            <div style={{ marginTop: 6, fontSize: 22, fontWeight: 800, color: "#0b5cff" }}>
              ₹{Number(product.price ?? 0).toFixed(2)}
            </div>
          </div>

          {Array.isArray(product.colors) && product.colors.length > 0 && (
            <div style={{ marginTop: 14 }}>
              <div style={{ marginBottom: 8, fontWeight: 700 }}>Color</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {product.colors.map((c) => {
                  const active = selectedColor === c;
                  return (
                    <button
                      key={c}
                      onClick={() => setSelectedColor(c)}
                      style={{
                        padding: "8px 12px",
                        borderRadius: 8,
                        border: active ? "2px solid #0b5cff" : "1px solid #e6e6e6",
                        background: active ? "#eef2ff" : "#fff",
                        cursor: "pointer",
                      }}
                    >
                      {c}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {Array.isArray(product.sizes) && product.sizes.length > 0 && (
            <div style={{ marginTop: 14 }}>
              <div style={{ marginBottom: 8, fontWeight: 700 }}>Size</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {product.sizes.map((s) => {
                  const active = selectedSize === s;
                  return (
                    <button
                      key={s}
                      onClick={() => setSelectedSize(s)}
                      style={{
                        padding: "8px 12px",
                        borderRadius: 8,
                        border: active ? "2px solid #0b5cff" : "1px solid #e6e6e6",
                        background: active ? "#eef2ff" : "#fff",
                        cursor: "pointer",
                      }}
                    >
                      {s}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ fontWeight: 700 }}>Quantity</div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <button onClick={decQty} style={{ width: 36, height: 32 }}>-</button>
              <input value={quantity} onChange={onQtyChange} style={{ width: 60, textAlign: "center", padding: 6 }} />
              <button onClick={incQty} style={{ width: 36, height: 32 }}>+</button>
            </div>
            {typeof product.stock === "number" && (
              <div style={{ marginLeft: 12, color: "#6b7280" }}>Stock: {product.stock}</div>
            )}
          </div>

          <div style={{ marginTop: 18, display: "flex", gap: 12 }}>
            <button
              onClick={handleAddToCart}
              disabled={adding}
              style={{
                background: "#f59e0b",
                color: "#fff",
                border: "none",
                padding: "10px 14px",
                borderRadius: 6,
                fontWeight: 700,
                cursor: adding ? "progress" : "pointer",
              }}
            >
              {adding ? "Adding..." : "Add to cart"}
            </button>

            <button
              onClick={toggleWishlist}
              title={saved ? "Saved to wishlist" : "Save for later"}
              aria-pressed={saved}
              style={{
                padding: "10px 14px",
                borderRadius: 6,
                border: saved ? "1px solid #ef4444" : "1px solid #e6e6e6",
                background: saved ? "#fff0f0" : "#fff",
                color: saved ? "#ef4444" : "#111",
                cursor: "pointer",
                fontWeight: 700,
              }}
            >
              {saved ? "♥ Saved" : "♡ Save"}
            </button>

            <Link to="/cart"><button style={{ padding: "10px 14px", borderRadius: 6, border: "1px solid #ccc", background: "#fff" }}>Go to cart</button></Link>
          </div>

          {error ? <div style={{ color: "#b91c1c", marginTop: 12 }}>{error}</div> : null}

          <div style={{ marginTop: 18, color: "#6b7280" }}>
            <div>Brand: {product.brand ?? "—"}</div>
            <div>Category: {product.category ?? "—"}</div>
          </div>
        </div>
      </div>

      <div
        aria-hidden="false"
        style={{
          position: "fixed",
          left: 20,
          right: 20,
          bottom: 20,
          margin: "0 auto",
          maxWidth: 980,
          background: "#e6fffa",
          border: "1px solid #bbf7d0",
          color: "#064e3b",
          padding: "12px 18px",
          borderRadius: 999,
          boxShadow: "0 6px 18px rgba(2,6,23,0.06)",
          display: "flex",
          alignItems: "center",
          gap: 12,
          justifyContent: "center",
          zIndex: 9999,
        }}
      >
        {leftForFree > 0 ? (
          <>
            <span style={{ fontWeight: 700 }}>📦</span>
            <div style={{ fontWeight: 700 }}>Add ₹{leftForFree.toFixed(2)} more to get free shipping.</div>
            <div style={{ color: "#065f46" }}>Subtotal ₹{(cartTotals.subtotal || 0).toFixed(2)}</div>
            <div style={{ marginLeft: 12 }}>
              <button onClick={() => navigate("/cart")} style={{ background: "#0b5cff", color: "#fff", padding: "8px 12px", borderRadius: 6, border: "none" }}>
                View Cart
              </button>
            </div>
          </>
        ) : (
          <>
            <span style={{ fontWeight: 700 }}>🎉</span>
            <div style={{ fontWeight: 700 }}>You have free shipping! Subtotal ₹{(cartTotals.subtotal || 0).toFixed(2)}</div>
            <div style={{ marginLeft: 12 }}>
              <button onClick={() => burstAt(productImageContainerRef.current || document.body, { count: 36 })} style={{ background: "#10b981", color: "#fff", padding: "8px 12px", borderRadius: 6, border: "none" }}>
                Celebrate
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
