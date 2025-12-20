// src/pages/ProductDetail.jsx
import React, { useEffect, useState, useRef, useCallback } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { getImageUrl, getImageUrls } from "../utils/imageUtils";
import { loadCart, computeTotals, SHIPPING_THRESHOLD } from "../utils/cartHelpers";


import { useCartDispatch } from "../context/CartContext";
import colorNames from "../utils/colorNames";

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

/* burst animation and image-zoom helpers (kept from your original file) */
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

/* ---------- small helpers for color/video/image ---------- */

const PLACEHOLDER = "/images/placeholder.png";

function normalizeHex(raw) {
  if (!raw) return null;
  let s = String(raw).trim();
  if (s.startsWith("0x")) s = s.slice(2);
  if (s.startsWith("#")) s = s.slice(1);
  s = s.replace(/[^0-9a-fA-F]/g, "");
  if (s.length === 3) s = s.split("").map(c => c + c).join("");
  if (s.length === 6) return ("#" + s).toUpperCase();
  return null;
}

function youtubeEmbedUrl(raw) {
  if (!raw || typeof raw !== "string") return null;
  const s = raw.trim();
  try {
    const url = new URL(s, window.location.origin);
    const host = url.hostname.toLowerCase();
    if (host.includes("youtube.com")) {
      if (url.pathname.startsWith("/embed/")) return `https://www.youtube.com${url.pathname}${url.search || ""}`;
      const vid = url.searchParams.get("v");
      if (vid) return `https://www.youtube.com/embed/${vid}`;
    }
    if (host.includes("youtu.be")) {
      const vid = url.pathname.replace("/", "");
      if (vid) return `https://www.youtube.com/embed/${vid}`;
    }
  } catch (err) {
    const maybeId = s.match(/^[A-Za-z0-9_-]{8,}$/);
    if (maybeId) return `https://www.youtube.com/embed/${maybeId[0]}`;
  }
  return null;
}

function isDirectVideoUrl(u) {
  if (!u || typeof u !== "string") return false;
  const lower = u.toLowerCase();
  return lower.endsWith(".mp4") || lower.endsWith(".webm") || lower.endsWith(".ogg");
}

/* ---------------- ProductDetail component ---------------- */
export default function ProductDetailPage({ products = [] }) {
  const { slug } = useParams();
  const navigate = useNavigate();
  const cartDispatch = useCartDispatch();
 const addToCartLockRef = useRef(false);

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
// related products (customers also viewed / frequently bought)
const [relatedProducts, setRelatedProducts] = useState([]);
const frequentlyBought = relatedProducts.slice(0, 3);

  // color list derived (each { raw, hex, name, imageUrl })
  const [derivedColors, setDerivedColors] = useState([]);

  // when a color has its own image not already in gallery, we temporarily show it
  const [tempColorImage, setTempColorImage] = useState(null);

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
  `/api/products?slug=${encodeURIComponent(slug)}`,
  `/api/products/${encodeURIComponent(slug)}`,
];

for (const ep of endpoints) {
  try {
    const resp = await fetch(ep);
    if (!resp.ok) throw new Error(`Failed ${ep} ${resp.status}`);
    const data = await resp.json();

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
  // fetch related products (customers also viewed / frequently bought)
useEffect(() => {
  if (!product?._id || !product?.category) return;

  let mounted = true;

  async function fetchRelatedProducts() {
    try {
     const resp = await fetch(
  `/api/products?category=${encodeURIComponent(product.category)}&limit=8`
);
if (!resp.ok) throw new Error("Related products fetch failed");
const data = await resp.json();


      const list = Array.isArray(data)
  ? data
  : data?.products || [];

      const filtered = list.filter(
        (p) => p._id !== product._id && p.slug !== product.slug
      );

      if (mounted) {
        setRelatedProducts(filtered.slice(0, 6));
      }
    } catch (err) {
      console.warn("[ProductDetail] related products fetch failed", err);
    }
  }

  fetchRelatedProducts();
  return () => {
    mounted = false;
  };
}, [product?._id, product?.category]);

  // Build gallery URLs whenever product.images (or product.image/thumbnail fallback) changes
  useEffect(() => {
    // gather base images
    const imgs = Array.isArray(product?.images) ? [...product.images] : [];
    if ((imgs.length === 0) && product?.image) imgs.push(product.image);
    if ((imgs.length === 0) && product?.thumbnail) imgs.push(product.thumbnail);

    // resolve urls using helper
    const urls = getImageUrls(imgs);
    setGalleryUrls(urls);
    setGalleryIndex(0);
    setTempColorImage(null);

    // build derivedColors using product.colors + color-image mapping (supports multiple shapes)
    const rawColors = Array.isArray(product?.colors)
      ? product.colors
      : (product?.colors ? String(product.colors).split(",").map(s => s.trim()).filter(Boolean) : []);

    // color->image map: support array/object shapes
    const colorImageMap = {};
    const rawColorImgs =
      product?.colorImages ||
      product?.color_image_map ||
      product?.color_map ||
      product?.colorImagesMap ||
      product?.colorImagesObj ||
      product?.colorImageMap ||
      product?.color_image ||
      null;

    if (rawColorImgs) {
      if (Array.isArray(rawColorImgs)) {
        rawColorImgs.forEach((ci) => {
          if (!ci) return;
          const name = (ci.name || ci.label || ci.color || "").toString().trim().toLowerCase();
          const img = ci.image || ci.url || ci.src || ci.path || null;
          if (name && img) colorImageMap[name] = getImageUrl(img);
        });
      } else if (typeof rawColorImgs === "object") {
        Object.entries(rawColorImgs).forEach(([k, v]) => {
          const name = String(k).trim().toLowerCase();
          const img = typeof v === "string" ? v : (v && (v.url || v.image || v.src || v.path));
          if (name && img) colorImageMap[name] = getImageUrl(img);
        });
      }
    }

    // compose derived colors
    const derived = rawColors.map((raw) => {
      const hex = normalizeHex(raw);
      const displayHex = hex || null;
      const friendly = displayHex ? colorNames.hexToName(displayHex) : (String(raw || ""));
      const mappedImg =
        (colorImageMap && (colorImageMap[String(raw).toLowerCase()] || colorImageMap[String(friendly).toLowerCase()])) || null;
      const imageUrl = mappedImg ? mappedImg : null;
      return { raw, displayHex, friendly, imageUrl };
    });

    setDerivedColors(derived);
  }, [product?.images, product?.image, product?.thumbnail, product?.colors, product?.slug, product?._id]);

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

  // 🔒 STRICTMODE GUARD (prevents double add)
  if (addToCartLockRef.current) return;
  addToCartLockRef.current = true;

  if (Array.isArray(product.colors) && product.colors.length > 0 && !selectedColor) {
    setError("Please select a color.");
    addToCartLockRef.current = false;
    return;
  }
  if (Array.isArray(product.sizes) && product.sizes.length > 0 && !selectedSize) {
    setError("Please select a size.");
    addToCartLockRef.current = false;
    return;
  }

  setAdding(true);
  setError(null);

  try {
    if (typeof cartDispatch === "function") {
      cartDispatch({
        type: "ADD_ITEM",
        payload: {
          productId: product._id ?? product.id ?? product.slug,
          title: product.title ?? product.name ?? "Product",
          price: Number(product.price ?? 0),
          image:
            product.image ??
            (product.images && product.images[0]
              ? product.images[0].url || product.images[0]
              : null),
          quantity: clampQty(quantity),
          meta: {
            color: selectedColor ?? null,
            size: selectedSize ?? null,
          },
        },
      });
    }

    window.dispatchEvent(new Event("cart-updated"));
  } catch (err) {
    console.error("Add to cart failed:", err);
    setError("Unable to add to cart.");
  } finally {
    setAdding(false);

    // 🔓 allow next click
    setTimeout(() => {
      addToCartLockRef.current = false;
    }, 0);
  }
}


  const leftForFree = Math.max(0, (SHIPPING_THRESHOLD - (cartTotals.subtotal || 0)));

  // Main displayed image: prefer tempColorImage if set, else selected gallery item
  const fallbackSrc =
    product?.thumbnail ||
    (product?.images && product.images[0] && (product.images[0].url || product.images[0])) ||
    product?.image ||
    null;
  const mainImageSrc = tempColorImage ? tempColorImage : (galleryUrls.length > 0 ? galleryUrls[galleryIndex] : getImageUrl(fallbackSrc));

  // Video detection (supports product.videoUrl / video / video_link)
  const possibleVideo =
    product?.videoUrl || product?.video || product?.video_url || product?.videoLink || product?.video_link || product?.productVideo || "";
  const embedUrl = youtubeEmbedUrl(possibleVideo);

  if (loading) {
    return <div style={{ padding: 24, paddingBottom: 120 }}><p>Loading product…</p></div>;
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

  /* ----------- LAYOUT: grid 3 columns (left gallery / center details / right video) ----------- */
  // On small screens the grid areas will stack naturally by using minmax and auto-fit via CSS fallback
  return (
    <div style={{ padding: 24 }}>
      <button onClick={() => navigate(-1)} style={{ marginBottom: 12 }}>← Back</button>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: embedUrl || isDirectVideoUrl(possibleVideo) ? "minmax(360px, 520px) 1fr 320px" : "minmax(360px, 520px) 1fr",
          gap: 24,
          alignItems: "start"
        }}
      >
        {/* Left: gallery */}
        <div style={{ width: "100%" }}>
          <div
            ref={productImageContainerRef}
            style={{
              height: 420,
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
            {galleryUrls.length > 1 && !tempColorImage && (
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

            {galleryUrls.length > 1 && !tempColorImage && (
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

          {/* thumbnails (smaller) */}
          <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
            {galleryUrls.map((u, i) => (
              <button
                key={u + i}
                onClick={() => { setTempColorImage(null); setGalleryIndex(i); }}
                style={{
                  border: i === galleryIndex && !tempColorImage ? "2px solid #0b5cff" : "1px solid #eee",
                  padding: 0,
                  borderRadius: 6,
                  overflow: "hidden",
                  width: 60,
                  height: 60,
                  background: "#fff",
                  cursor: "pointer",
                }}
                aria-label={`Show image ${i + 1}`}
              >
                <img src={u} alt={`${product.title}-${i}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              </button>
            ))}

            {derivedColors.map((c, idx) => {
              if (!c.imageUrl) return null;
              const exists = galleryUrls.includes(c.imageUrl);
              if (exists) return null;
              return (
                <button
                  key={`cimg-${idx}`}
                  onClick={() => { setTempColorImage(c.imageUrl); setSelectedColor(c.raw); }}
                  title={c.friendly}
                  style={{
                    width: 60, height: 60, borderRadius: 6, overflow: "hidden",
                    border: tempColorImage === c.imageUrl ? "2px solid #0b5cff" : "1px solid #eee",
                    padding: 0, background: "#fff", cursor: "pointer"
                  }}
                >
                  <img src={c.imageUrl} alt={`color-${idx}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                </button>
              );
            })}

            {possibleVideo && (
              <div title="Video" onClick={() => { const el = document.getElementById("product-video-player"); if (el) el.scrollIntoView({behavior:"smooth", block:"center"}); }}
                style={{ width: 60, height: 60, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid #eee", background: "#fafafa", cursor: "pointer" }}>
                <svg width="20" height="20" viewBox="0 0 24 24"><path d="M5 3v18l15-9L5 3z" fill="currentColor"/></svg>
              </div>
            )}
          </div>
        </div>

        {/* Middle: product info (colors + sizes + CTA) */}
        <div style={{ minWidth: 320 }}>
		 {/* Free shipping info (moved near title) */}

  <div
  style={{
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    marginBottom: 12,
    padding: "8px 14px",
    background: "#ecfdf5",
    border: "1px solid #a7f3d0",
    color: "#065f46",
    borderRadius: 999,
    fontWeight: 700,
    fontSize: 14,
    flexWrap: "wrap",
    textAlign: "center",
    marginLeft: "auto",
    marginRight: "auto",
    maxWidth: 980,
  }}
>
  {cartTotals.subtotal < SHIPPING_THRESHOLD ? (
    <>
      <span>📦</span>
      <div>
        <div>
          Free shipping available on orders above ₹{SHIPPING_THRESHOLD}
        </div>
        <div>
          Add ₹{Math.max(0, SHIPPING_THRESHOLD - cartTotals.subtotal).toFixed(2)} more
          to get FREE shipping
        </div>
        <div>
          Current subtotal ₹{(cartTotals.subtotal || 0).toFixed(2)}
        </div>
      </div>
    </>
  ) : (
    <>
      <span>🎉</span>
      <span>
        You have free shipping! Subtotal ₹{(cartTotals.subtotal || 0).toFixed(2)}
      </span>

      <button
        onClick={() =>
          burstAt(productImageContainerRef.current || document.body, {
            count: 36,
          })
        }
        style={{
          marginLeft: 6,
          background: "#10b981",
          color: "#fff",
          border: "none",
          padding: "6px 12px",
          borderRadius: 999,
          cursor: "pointer",
          fontWeight: 700,
        }}
      >
        Celebrate
      </button>
    </>
  )}
</div>


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
          {/* Frequently Bought Together */}
{frequentlyBought.length > 0 && (
  <div style={{ marginTop: 18 }}>
    <div style={{ fontWeight: 700, marginBottom: 10 }}>
      Frequently Bought Together
    </div>

    <div style={{ display: "flex", gap: 12 }}>
      {frequentlyBought.map((p) => (
        <Link
          key={p._id}
          to={`/product/${p.slug}`}
          style={{
            textDecoration: "none",
            color: "inherit",
            border: "1px solid #eee",
            borderRadius: 6,
            padding: 8,
            width: 110,
            background: "#fff",
          }}
        >
          <img
            src={getImageUrl(p.image || p.images?.[0])}
            alt={p.title}
            style={{
              width: "100%",
              height: 110,
              objectFit: "cover",
              borderRadius: 4,
            }}
          />
          <div style={{ fontSize: 12, fontWeight: 600, marginTop: 6 }}>
            {p.title}
          </div>
          <div style={{ fontSize: 12, color: "#0b5cff", fontWeight: 700 }}>
            ₹{Number(p.price || 0).toFixed(2)}
          </div>
        </Link>
      ))}
    </div>
  </div>
)}

          {/* Colors: render improved swatches with friendly names (smaller) */}
          {derivedColors.length > 0 && (
            <div style={{ marginTop: 14 }}>
              <div style={{ marginBottom: 8, fontWeight: 700 }}>Color</div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                {derivedColors.map((c) => {
                  const label = c.friendly || (c.displayHex || c.raw);
                  const active = selectedColor === c.raw;
                  const swatchBg = c.displayHex || "#fff";
                  return (
                    <div key={String(c.raw)} style={{ textAlign: "center", minWidth: 72 }}>
                      <button
                        onClick={() => {
                          setSelectedColor(c.raw);
                          if (c.imageUrl) {
                            const idx = galleryUrls.findIndex(u => u === c.imageUrl);
                            if (idx >= 0) { setTempColorImage(null); setGalleryIndex(idx); }
                            else { setTempColorImage(c.imageUrl); }
                          } else {
                            setTempColorImage(null);
                            if (galleryUrls.length > 0) setGalleryIndex(0);
                          }
                        }}
                        title={label}
                        style={{
                          width: 36, height: 28, borderRadius: 8,
                          border: active ? "2px solid #0b5cff" : "1px solid #e6e6e6",
                          background: swatchBg,
                          backgroundImage: c.imageUrl && !c.displayHex ? `url(${c.imageUrl})` : undefined,
                          backgroundSize: "cover",
                          backgroundPosition: "center",
                          cursor: "pointer",
                          display: "inline-block"
                        }}
                      />
                      <div style={{ marginTop: 6, fontSize: 12 }}>{label}</div>
                    </div>
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

        {/* Right: video (only rendered if video exists) */}
        {possibleVideo && (
          <div style={{ alignSelf: "start" }}>
            <div style={{ marginBottom: 8, fontWeight: 700 }}>Product video</div>
            {embedUrl ? (
              <div style={{ width: "100%", height: 220, border: "1px solid #eee", borderRadius: 8, overflow: "hidden", background: "#000" }}>
                <iframe
                  title="product-video"
                  width="100%"
                  height="100%"
                  src={embedUrl}
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            ) : isDirectVideoUrl(possibleVideo) ? (
              <div style={{ width: "100%", height: 220, border: "1px solid #eee", borderRadius: 8, overflow: "hidden", background: "#000" }}>
                <video controls style={{ width: "100%", height: "100%" }}>
                  <source src={possibleVideo} />
                </video>
              </div>
            ) : (
              <div style={{ fontSize: 13 }}>
                <a href={possibleVideo} target="_blank" rel="noreferrer">Open video</a>
              </div>
            )}
          </div>
        )}
      </div>
      {/* Related products */}
{relatedProducts.length > 0 && (
  <div style={{ marginTop: 48 }}>
    <h2 style={{ marginBottom: 16 }}>Customers also viewed</h2>

    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
        gap: 16,
      }}
    >
      {relatedProducts.map((p) => (
        <Link
          key={p._id}
          to={`/product/${p.slug}`}
          style={{
            textDecoration: "none",
            color: "inherit",
            border: "1px solid #eee",
            borderRadius: 8,
            padding: 12,
            background: "#fff",
          }}
        >
          <img
            src={getImageUrl(p.image || p.images?.[0])}
            alt={p.title}
            style={{
              width: "100%",
              height: 180,
              objectFit: "cover",
              borderRadius: 6,
            }}
          />
          <div style={{ marginTop: 8, fontWeight: 700 }}>
            {p.title}
          </div>
          <div style={{ color: "#0b5cff", fontWeight: 800 }}>
            ₹{Number(p.price || 0).toFixed(2)}
          </div>
        </Link>
      ))}
    </div>
  </div>
)}

</div>

);
}

