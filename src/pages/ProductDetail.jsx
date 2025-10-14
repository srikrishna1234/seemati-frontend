import React, { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useCartDispatch } from "../context/CartContext";
import { FaRegBookmark, FaBookmark } from "react-icons/fa";

const BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:4000";
const PLACEHOLDER = "/images/placeholder.png";
const WISHLIST_KEY = "wishlist_v1";

/* Helpers (same logic as ProductCard) */
function stringToAbsolute(s) {
  if (!s) return null;
  const trimmed = String(s).trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed;
  if (trimmed.startsWith("//")) return window.location.protocol + trimmed;
  if (trimmed.startsWith("/")) return `${BASE_URL}${trimmed}`;
  if (/\.[a-zA-Z0-9]{2,6}$/.test(trimmed)) return `${BASE_URL}/uploads/${trimmed}`;
  return `${BASE_URL}/${trimmed}`;
}
function resolveImageUrl(raw) {
  if (!raw) return null;
  const candidateToUrl = (c) => {
    if (!c) return null;
    if (typeof c === "object") {
      const url = c.url || c.path || c.filename || c.fileName || c.src || null;
      return stringToAbsolute(url);
    }
    if (typeof c === "string") return stringToAbsolute(c);
    return null;
  };

  if (Array.isArray(raw) && raw.length > 0) {
    const arr = raw.map(candidateToUrl).filter(Boolean);
    return arr.length > 0 ? arr : null;
  }
  const single = candidateToUrl(raw);
  return single ? [single] : null;
}

function readWishlist() {
  try {
    const raw = localStorage.getItem(WISHLIST_KEY) || "[]";
    return JSON.parse(raw);
  } catch (e) {
    return [];
  }
}
function writeWishlist(arr) {
  try {
    localStorage.setItem(WISHLIST_KEY, JSON.stringify(arr || []));
    window.dispatchEvent(new CustomEvent("wishlist-updated", { detail: { count: (arr || []).length } }));
  } catch (e) {
    console.error("writeWishlist failed", e);
  }
}

export default function ProductDetail({ product: productProp }) {
  const { id: paramId } = useParams();
  const navigate = useNavigate();
  const cartDispatch = useCartDispatch();

  const [product, setProduct] = useState(productProp || null);
  const [loading, setLoading] = useState(!productProp);
  const [error, setError] = useState(null);
  const [images, setImages] = useState([]);
  const [mainIndex, setMainIndex] = useState(0);
  const [saved, setSaved] = useState(false);

  // zoom state
  const [isZoomed, setIsZoomed] = useState(false);
  const [origin, setOrigin] = useState({ x: 50, y: 50 }); // percent
  const mainWrapRef = useRef(null);

  // for touch swipe
  const touchStartX = useRef(null);
  const touchEndX = useRef(null);

  useEffect(() => {
    if (productProp) return;
    if (!paramId) return;
    setLoading(true);
    fetch(`${BASE_URL}/api/products/${paramId}`)
      .then((r) => {
        if (!r.ok) throw new Error(`Fetch failed: ${r.status}`);
        return r.json();
      })
      .then((data) => {
        const p = data.product || data;
        setProduct(p);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Product fetch error", err);
        setError(err.message || "Failed to load product");
        setLoading(false);
      });
  }, [paramId, productProp]);

  useEffect(() => {
    if (!product) {
      setImages([]);
      setMainIndex(0);
      setSaved(false);
      return;
    }

    const rawCandidates = [
      product.images,
      product.imagesList,
      product.image,
      product.thumbnails,
      product.thumbnail,
      product.primaryImage,
      product.gallery,
    ];

    let final = null;
    for (const c of rawCandidates) {
      const resolved = resolveImageUrl(c);
      if (resolved && resolved.length > 0) {
        final = resolved;
        break;
      }
    }

    if (!final) {
      const keys = Object.keys(product);
      for (const k of keys) {
        const v = product[k];
        if (typeof v === "string" && (v.endsWith(".png") || v.endsWith(".jpg") || v.endsWith(".jpeg") || v.endsWith(".webp"))) {
          final = [stringToAbsolute(v)];
          break;
        }
      }
    }

    if (!final) final = [PLACEHOLDER];

    setImages(final);
    setMainIndex(0);

    // wishlist saved state
    const cur = readWishlist();
    const pid = product._id || product.id || "";
    setSaved(cur.some((it) => (it._id || it.id || it.productId) === pid));
  }, [product]);

  // keyboard navigation
  const handleKey = useCallback(
    (e) => {
      if (!images || images.length <= 1) return;
      if (e.key === "ArrowRight") setMainIndex((i) => (i + 1) % images.length);
      if (e.key === "ArrowLeft") setMainIndex((i) => (i - 1 + images.length) % images.length);
    },
    [images]
  );
  useEffect(() => {
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [handleKey]);

  // touch handlers for swipe
  function onTouchStart(e) {
    touchStartX.current = e.touches[0].clientX;
  }
  function onTouchMove(e) {
    touchEndX.current = e.touches[0].clientX;
  }
  function onTouchEnd() {
    if (touchStartX.current == null || touchEndX.current == null) {
      touchStartX.current = null;
      touchEndX.current = null;
      return;
    }
    const dx = touchEndX.current - touchStartX.current;
    const threshold = 40; // px
    if (dx > threshold) {
      // swipe right -> previous
      setMainIndex((i) => (i - 1 + images.length) % images.length);
    } else if (dx < -threshold) {
      // swipe left -> next
      setMainIndex((i) => (i + 1) % images.length);
    }
    touchStartX.current = null;
    touchEndX.current = null;
  }

  // Add to cart (uses your existing context dispatch)
  function handleAddToCart() {
    if (!product) return;
    const price = Number(product.price ?? product.sellingPrice ?? product.amount ?? 0) || 0;
    const mrp = (() => {
      const keys = ["mrp", "MRP", "maxPrice", "originalPrice", "listPrice", "list_price", "compareAtPrice", "compare_price", "strikePrice", "retailPrice", "rrp", "recommendedRetailPrice", "price_max", "price_original", "original_price", "compare_at_price"];
      for (const k of keys) {
        if (Object.prototype.hasOwnProperty.call(product, k)) {
          const n = Number(product[k]);
          if (Number.isFinite(n) && n > 0) return n;
        }
      }
      return null;
    })();

    const item = {
      productId: product._id || product.id,
      title: product.title,
      price: price,
      mrp: mrp || null,
      quantity: 1,
      size: null,
      color: null,
      image: images[mainIndex] || null,
      rawProduct: product,
    };
    try {
      cartDispatch({ type: "ADD_ITEM", payload: item });
    } catch (err) {
      console.error("Quick add failed", err);
    }
  }

  // Save for later (wishlist using localStorage)
  function handleSaveForLater() {
    if (!product) return;
    const cur = readWishlist();
    const keyId = product._id || product.id || "";
    const exists = cur.find((it) => (it._id || it.id || it.productId) === keyId);

    if (exists) {
      const next = cur.filter((it) => (it._id || it.id || it.productId) !== keyId);
      writeWishlist(next);
      setSaved(false);
    } else {
      const toSave = {
        _id: product._id || product.id || keyId,
        title: product.title,
        price: Number(product.price ?? product.sellingPrice ?? 0) || 0,
        mrp: null,
        image: images[mainIndex] || null,
        raw: product,
      };
      const next = [...cur, toSave];
      writeWishlist(next);
      setSaved(true);
    }
  }

  // mouse handlers for zoom origin
  function handleMouseMove(e) {
    if (!mainWrapRef.current) return;
    const rect = mainWrapRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    // clamp so top of head doesn't disappear (adjust if your photography needs different values)
    const clampedY = Math.min(85, Math.max(12, y));
    const clampedX = Math.min(88, Math.max(12, x));

    setOrigin({ x: clampedX, y: clampedY });
  }

  function handleMouseEnter() {
    setIsZoomed(true);
  }
  function handleMouseLeave() {
    setIsZoomed(false);
  }

  if (loading) return <div style={{ padding: 20 }}>Loading product…</div>;
  if (error) return <div style={{ padding: 20, color: "red" }}>Error: {error}</div>;
  if (!product) return <div style={{ padding: 20 }}>No product found</div>;

  const mainImage = images[mainIndex] || PLACEHOLDER;

  /* Styles */
  const containerStyle = {
    padding: 12,
    display: "flex",
    gap: 18,
    alignItems: "flex-start",
    overflow: "visible", // ensure zoom isn't clipped by ancestor
  };

  const leftColStyle = {
    width: 520,
    display: "flex",
    flexDirection: "column",
    gap: 8,
  };

  const mainBoxStyle = {
    background: "#fff",
    borderRadius: 12,
    padding: 12,
    border: "1px solid #eee",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    overflow: "visible", // important for pop-out zoom
    position: "relative",
  };

  const mainImageStyle = {
    maxWidth: "100%",
    maxHeight: 360,
    objectFit: "contain",
    display: "block",
    transition: "transform 420ms cubic-bezier(.2,.8,.2,1), box-shadow 220ms ease",
    transformOrigin: `${origin.x}% ${origin.y}%`,
    zIndex: isZoomed ? 9999 : 1,
    transform: isZoomed ? "scale(1.5)" : "scale(1)",
  };

  const thumbsRowStyle = {
    display: "flex",
    gap: 10,
    marginTop: 8,
    flexWrap: "wrap",
    alignItems: "center",
  };

  // keep a minimal focus style for thumbs
  const thumbFocusCSS = `
    .pd-thumb-btn:focus { outline: 2px solid rgba(37,99,235,0.18); outline-offset: 2px; }
  `;

  return (
    <div style={containerStyle}>
      <style dangerouslySetInnerHTML={{ __html: thumbFocusCSS }} />

      <div style={leftColStyle}>
        {/* main image wrapper: listens for touch events for swipe */}
        <div
          ref={mainWrapRef}
          style={mainBoxStyle}
          className="pd-main-wrap"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          onMouseMove={handleMouseMove}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <img
            src={mainImage}
            alt={product.title || "product"}
            className="pd-main-img"
            style={mainImageStyle}
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = PLACEHOLDER;
            }}
          />
        </div>

        {images && images.length > 1 && (
          <div style={thumbsRowStyle} role="tablist" aria-label="Product thumbnails">
            {images.map((src, i) => (
              <button
                key={i}
                onClick={() => setMainIndex(i)}
                className="pd-thumb-btn"
                style={{
                  width: 72,
                  height: 72,
                  padding: 6,
                  borderRadius: 6,
                  border: i === mainIndex ? "2px solid #2563eb" : "1px solid #eee",
                  background: "#fff",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
                aria-label={`Show image ${i + 1}`}
              >
                <img
                  src={src}
                  alt={`thumb-${i}`}
                  style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }}
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = PLACEHOLDER;
                  }}
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Right: product info */}
      <div style={{ flex: 1 }}>
        <h1 style={{ margin: 0, fontSize: 28 }}>{product.title}</h1>

        <div style={{ marginTop: 8, color: "#6b7280" }}>{product.description}</div>

        <div style={{ marginTop: 12, display: "flex", gap: 12 }}>
          <div style={{ background: "#f3f4f6", padding: 10, borderRadius: 8 }}>
            <div style={{ fontSize: 12, color: "#6b7280" }}>MRP</div>
            <div style={{ fontWeight: 700 }}>{product.mrp ? `₹${product.mrp}` : "—"}</div>
          </div>
          <div style={{ background: "#f3f4f6", padding: 10, borderRadius: 8 }}>
            <div style={{ fontSize: 12, color: "#6b7280" }}>Our Price</div>
            <div style={{ fontWeight: 700, color: "#16a34a" }}>{product.price ? `₹${product.price}` : "—"}</div>
          </div>
        </div>

        <div style={{ marginTop: 12, display: "flex", gap: 10 }}>
          <button
            onClick={handleAddToCart}
            style={{ background: "#2563eb", color: "#fff", border: "none", padding: "10px 14px", borderRadius: 8 }}
          >
            Add to Cart
          </button>

          <button onClick={() => navigate(-1)} style={{ border: "1px solid #e5e7eb", padding: "10px 12px", borderRadius: 8 }}>
            Back
          </button>

          <button
            onClick={handleSaveForLater}
            style={{
              marginLeft: 8,
              borderRadius: 8,
              padding: "10px 12px",
              border: "1px solid #d1fae5",
              background: saved ? "#059669" : "#ecfdf5",
              color: saved ? "#fff" : "#065f46",
              cursor: "pointer",
            }}
            aria-pressed={saved}
          >
            {saved ? (
              <>
                <FaBookmark /> Saved
              </>
            ) : (
              <>
                <FaRegBookmark /> Save for later
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
