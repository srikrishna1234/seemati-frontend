// src/components/ProductCard.jsx
import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useCartDispatch } from "../context/CartContext";
import { FaEye, FaRegBookmark, FaBookmark, FaShoppingCart } from "react-icons/fa";

const BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:4000";
const PLACEHOLDER = "/images/placeholder.png";
const WISHLIST_KEY = "wishlist_v1";

/* utility functions (unchanged) */
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

function resolveImageUrl(rawImages) {
  if (!rawImages) return null;
  const candidateToUrl = (c) => {
    if (!c) return null;
    if (typeof c === "object") {
      const url = c.url || c.path || c.filename || null;
      return stringToAbsolute(url);
    }
    if (typeof c === "string") return stringToAbsolute(c);
    return null;
  };
  if (Array.isArray(rawImages) && rawImages.length > 0) {
    for (let i = 0; i < rawImages.length; i++) {
      const u = candidateToUrl(rawImages[i]);
      if (u) return u;
    }
    return null;
  }
  if (typeof rawImages === "string") return candidateToUrl(rawImages);
  if (typeof rawImages === "object") return candidateToUrl(rawImages);
  return null;
}

function detectMrp(product) {
  if (!product || typeof product !== "object") return null;
  const keys = [
    "mrp", "MRP", "maxPrice", "originalPrice", "listPrice", "list_price",
    "compareAtPrice", "compare_price", "strikePrice", "retailPrice", "rrp",
    "recommendedRetailPrice", "price_max", "price_original", "original_price",
    "compare_at_price"
  ];
  for (const k of keys) {
    if (Object.prototype.hasOwnProperty.call(product, k)) {
      const n = Number(product[k]);
      if (Number.isFinite(n) && n > 0) return n;
    }
  }
  try {
    if (product.priceRange && product.priceRange.max) {
      const n = Number(product.priceRange.max);
      if (Number.isFinite(n) && n > 0) return n;
    }
  } catch (e) {}
  return null;
}

function normalizeOptionArray(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw
      .map((x) => {
        if (!x) return null;
        if (typeof x === "object") {
          return x.value || x.label || x.name || x.hex || x || null;
        }
        return String(x).trim();
      })
      .filter(Boolean);
  }
  if (typeof raw === "string") {
    return raw.split(",").map((s) => s.trim()).filter(Boolean);
  }
  return [];
}

function fmtIN(n) {
  if (typeof n !== "number" || Number.isNaN(n)) return "—";
  return n.toLocaleString("en-IN");
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

export default function ProductCard({ product, to }) {
  const navigate = useNavigate();
  const cartDispatch = useCartDispatch();
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!product) {
      setSaved(false);
      return;
    }
    const cur = readWishlist();
    const pid = product._id || product.id || "";
    setSaved(cur.some((it) => (it._id || it.id || it.productId) === pid));
  }, [product]);

  useEffect(() => {
    function onUpdate() {
      if (!product) return;
      const cur = readWishlist();
      const pid = product._id || product.id || "";
      setSaved(cur.some((it) => (it._id || it.id || it.productId) === pid));
    }
    window.addEventListener("wishlist-updated", onUpdate);
    window.addEventListener("storage", (e) => { if (e.key === WISHLIST_KEY) onUpdate(); });
    return () => {
      window.removeEventListener("wishlist-updated", onUpdate);
      window.removeEventListener("storage", () => {});
    };
  }, [product]);

  if (!product) return null;

  const id = product._id || product.id || "";
  const url = to || `/product/${id}`;

  const price = (() => {
    const p = product.price ?? product.sellingPrice ?? product.currentPrice ?? product.amount ?? 0;
    const n = Number(p);
    return Number.isFinite(n) ? n : 0;
  })();
  const mrp = detectMrp(product);
  const hasValidPrice = typeof price === "number" && price > 0;
  const hasValidMrp = typeof mrp === "number" && mrp > 0 && mrp > price;
  const youSave = hasValidMrp && hasValidPrice ? mrp - price : null;
  const discountPercent = hasValidMrp && hasValidPrice ? Math.round(((mrp - price) / mrp) * 100) : null;

  const rawImages = product.images || product.image || product.imagesList || null;
  const imageUrl = resolveImageUrl(rawImages) || product.thumbnail || PLACEHOLDER;

  const sizes = normalizeOptionArray(product.sizes || product.sizeOptions || product.size || null);
  const colors = normalizeOptionArray(product.colors || product.colorOptions || product.color || null);
  const requiresSize = sizes.length > 0;
  const requiresColor = colors.length > 0;

  function handleQuickAdd(e) {
    if (e && e.stopPropagation) e.stopPropagation();
    e && e.preventDefault && e.preventDefault();

    const multiSize = requiresSize && sizes.length > 1;
    const multiColor = requiresColor && colors.length > 1;

    if (multiSize || multiColor) {
      const defaultSize = sizes[0] || "N/A";
      const defaultColor = colors[0] || "N/A";
      const confirmMsg = `This product has multiple options.\n\nAdd with defaults?\nSize: ${defaultSize}\nColor: ${defaultColor}\n\nPress OK to add with defaults, Cancel to choose options.`;
      const ok = window.confirm(confirmMsg);
      if (!ok) {
        navigate(url);
        return;
      }
    }

    const item = {
      productId: product._id || product.id,
      title: product.title,
      price: price,
      mrp: mrp || null,
      quantity: 1,
      size: requiresSize ? (sizes[0] || null) : null,
      color: requiresColor ? (colors[0] || null) : null,
      image: imageUrl || null,
      rawProduct: product,
    };

    try {
      cartDispatch({ type: "ADD_ITEM", payload: item });
    } catch (err) {
      console.error("Quick add failed", err);
      navigate(url);
    }
  }

  function handleSaveForLater(e) {
    if (e && e.stopPropagation) e.stopPropagation();
    e && e.preventDefault && e.preventDefault();

    const cur = readWishlist();
    const keyId = product._id || product.id || id;
    const exists = cur.find((it) => (it._id || it.id || it.productId) === keyId);

    if (exists) {
      const next = cur.filter((it) => (it._id || it.id || it.productId) !== keyId);
      writeWishlist(next);
      setSaved(false);
    } else {
      const toSave = {
        _id: product._id || product.id || id,
        title: product.title,
        price: price,
        mrp: mrp || null,
        image: imageUrl || null,
        raw: product,
      };
      const next = [...cur, toSave];
      writeWishlist(next);
      setSaved(true);
    }
  }

  function handleView(e) {
    e && e.stopPropagation && e.stopPropagation();
    navigate(url);
  }

  /* Scoped CSS for buttons and image zoom (40% zoom) */
  const scopedCSS = `
    /* button base */
    .sm-product-btn { 
      color: #fff; 
      border: none; 
      cursor: pointer; 
      padding: 10px 14px; 
      border-radius: 8px; 
      display: inline-flex; 
      align-items: center; 
      gap: 8px;
      transition: background-color 180ms ease, transform 120ms ease;
      font-weight: 600;
      vertical-align: middle;
    }
    .sm-product-btn:active { transform: translateY(1px); }

    /* Add - orange */
    .sm-btn-add { background: #f59e0b; }
    .sm-btn-add:hover { background: #b45309; }

    /* View - blue */
    .sm-btn-view { background: #2563eb; }
    .sm-btn-view:hover { background: #1e40af; }

    /* Save - green */
    .sm-btn-save { background: #16a34a; }
    .sm-btn-save:hover { background: #166534; }

    /* make sure svg icon inherits color */
    .sm-product-btn svg { vertical-align: middle; }

    /* IMAGE ZOOM for listing pages (40% zoom, allow pop-out so head/foot visible) */
    .sm-image-wrap {
      width: 100%;
      height: 190px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #fafafa;
      border-radius: 6px;
      overflow: visible; /* allow zoom beyond bounds */
      box-sizing: border-box;
    }
    .sm-image {
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
      transition: transform 420ms cubic-bezier(.2,.8,.2,1);
      transform-origin: center center;
      will-change: transform;
      display: block;
    }
    /* scale to 1.4 (40% zoom) */
    .sm-image-wrap:hover .sm-image {
      transform: scale(1.4);
    }
  `;

  return (
    <div
      className="product-card"
      style={{
        border: "1px solid #f0f0f0",
        borderRadius: 8,
        padding: 12,
        width: 300,
        background: "#fff",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
      }}
    >
      {/* Inject scoped CSS */}
      <style dangerouslySetInnerHTML={{ __html: scopedCSS }} />

      <Link to={url} style={{ textDecoration: "none", color: "inherit", display: "block" }}>
        <div className="sm-image-wrap">
          <img
            className="sm-image"
            src={imageUrl}
            alt={product.title || "product"}
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = PLACEHOLDER;
            }}
          />
        </div>

        <div style={{ marginTop: 10 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#111827", minHeight: 44 }}>
            {product.title}
          </div>

          <div style={{ marginTop: 8 }}>
            <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
              <div>
                <div style={{ fontSize: 11, color: "#6b7280" }}>MRP</div>
                <div style={{ fontSize: 13, color: "#6b7280", textDecoration: hasValidMrp ? "line-through" : "none" }}>
                  {hasValidMrp ? `₹${fmtIN(mrp)}` : "—"}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: "#6b7280" }}>Price</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: "#166534" }}>
                  {hasValidPrice ? `₹${fmtIN(price)}` : "—"}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: "#6b7280" }}>You Save</div>
                <div style={{ fontSize: 13, color: youSave !== null ? "#dc2626" : "#6b7280", fontWeight: 600 }}>
                  {youSave !== null ? `₹${fmtIN(youSave)}` : "—"}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: "#6b7280" }}>Discount</div>
                <div style={{ fontSize: 13, color: "#374151", fontWeight: 600 }}>
                  {discountPercent !== null ? `${discountPercent}%` : "—"}
                </div>
              </div>
            </div>
          </div>
        </div>
      </Link>

      {/* Buttons row */}
      <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={handleQuickAdd}
          className="sm-product-btn sm-btn-add"
          aria-label="Add to cart"
        >
          <FaShoppingCart /> Add
        </button>

        <button
          type="button"
          onClick={handleView}
          className="sm-product-btn sm-btn-view"
          aria-label="View product"
        >
          <FaEye /> View
        </button>

        <button
          type="button"
          onClick={handleSaveForLater}
          className="sm-product-btn sm-btn-save"
          aria-label={saved ? "Saved" : "Save for later"}
        >
          {saved ? <><FaBookmark /> Saved</> : <><FaRegBookmark /> Save for later</>}
        </button>
      </div>
    </div>
  );
}
