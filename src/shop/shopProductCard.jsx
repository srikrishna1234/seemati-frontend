import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";

/**
 * shopProductCard.jsx
 * - Shows product thumbnail, title, price, and actions: View / Wishlist / Explore
 * - Wishlist toggles saved state in localStorage (key: 'seemati_wishlist')
 * - After toggling wishlist it dispatches a custom event 'seemati:wishlist-updated'
 *
 * Usage:
 * <ShopProductCard product={p} onView={() => {}} />
 */

export default function ShopProductCard({ product, onView, onExplore }) {
  const { _id, title, price, thumbnail } = product || {};
  const [wishSaved, setWishSaved] = useState(false);

  useEffect(() => {
    const list = getWishlist();
    setWishSaved(list.includes(_id));
  }, [_id]);

  function getWishlist() {
    try {
      const raw = localStorage.getItem("seemati_wishlist");
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      console.error("wishlist read error", e);
      return [];
    }
  }

  function setWishlist(list) {
    try {
      localStorage.setItem("seemati_wishlist", JSON.stringify(list));
    } catch (e) {
      console.error("wishlist save error", e);
    }
  }

  function emitWishlistEvent(list) {
    const event = new CustomEvent("seemati:wishlist-updated", {
      detail: {
        count: list.length,
        ids: list.slice(),
      },
    });
    window.dispatchEvent(event);
  }

  function toggleWishlist(e) {
    e.stopPropagation();
    const list = getWishlist();
    const idx = list.indexOf(_id);
    if (idx === -1) {
      // add
      list.push(_id);
      setWishSaved(true);
    } else {
      // remove
      list.splice(idx, 1);
      setWishSaved(false);
    }
    setWishlist(list);
    emitWishlistEvent(list);

    // Optional: If you have an API to persist wishlist, call it here.
    // fetch('/api/wishlist', { method: 'POST', body: JSON.stringify({ ids: list })})
  }

  return (
    <div className="shop-product-card" style={cardStyle}>
      <div style={thumbWrapStyle}>
        <img
          src={thumbnail || "/placeholder.png"}
          alt={title}
          style={thumbStyle}
          loading="lazy"
        />
      </div>

      <div style={metaStyle}>
        <div style={{ fontSize: 14, fontWeight: 600 }}>{title}</div>
        <div style={{ marginTop: 6 }}>
          <span style={{ fontWeight: 700 }}>₹{price}</span>
        </div>
      </div>

      <div style={actionsStyle}>
        <button onClick={() => onView(product)} style={viewBtnStyle}>
          View
        </button>

        <button
          onClick={toggleWishlist}
          aria-pressed={wishSaved}
          title={wishSaved ? "Remove from wishlist" : "Add to wishlist"}
          style={wishBtnStyle}
        >
          {wishSaved ? "♥ Saved" : "♡ Wishlist"}
        </button>

        <button onClick={() => onExplore(product)} style={exploreBtnStyle}>
          Explore
        </button>
      </div>
    </div>
  );
}

ShopProductCard.propTypes = {
  product: PropTypes.object.isRequired,
  onView: PropTypes.func,
  onExplore: PropTypes.func,
};

ShopProductCard.defaultProps = {
  onView: () => {},
  onExplore: () => {},
};

/* ----------------- Inline styles (keeps the files self-contained) ----------------- */

const cardStyle = {
  display: "flex",
  flexDirection: "column",
  gap: 8,
  border: "1px solid #eee",
  borderRadius: 10,
  padding: 12,
  background: "#fff",
  minWidth: 180,
  maxWidth: 220,
};

const thumbWrapStyle = {
  width: "100%",
  paddingBottom: "100%",
  position: "relative",
  overflow: "hidden",
  borderRadius: 8,
  background: "#fafafa",
};

const thumbStyle = {
  position: "absolute",
  width: "100%",
  height: "100%",
  objectFit: "cover",
  top: 0,
  left: 0,
};

const metaStyle = {
  display: "block",
  paddingTop: 4,
};

const actionsStyle = {
  display: "flex",
  gap: 8,
  alignItems: "center",
  justifyContent: "space-between",
};

const btnBase = {
  borderRadius: 8,
  padding: "6px 10px",
  cursor: "pointer",
  border: "none",
  fontSize: 13,
};

const viewBtnStyle = {
  ...btnBase,
  background: "#6b21a8",
  color: "#fff",
};

const wishBtnStyle = {
  ...btnBase,
  background: "#fff",
  border: "1px solid #ddd",
};

const exploreBtnStyle = {
  ...btnBase,
  background: "#f3f4f6",
};
