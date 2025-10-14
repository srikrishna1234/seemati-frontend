// src/pages/WishlistPage.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCartDispatch } from "../context/CartContext";

const WISHLIST_KEY = "wishlist_v1";

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

export default function WishlistPage() {
  const [items, setItems] = useState(readWishlist());
  const navigate = useNavigate();
  const cartDispatch = useCartDispatch();

  useEffect(() => {
    function onUpdate() {
      setItems(readWishlist());
    }
    window.addEventListener("wishlist-updated", onUpdate);
    return () => window.removeEventListener("wishlist-updated", onUpdate);
  }, []);

  function removeItem(id) {
    const next = items.filter((it) => (it._id || it.id || it.productId) !== id);
    writeWishlist(next);
    setItems(next);
  }

  function moveToCart(it) {
    try {
      const entry = {
        productId: it._id || it.id || it.productId,
        title: it.title,
        price: Number(it.price) || 0,
        mrp: it.mrp || null,
        quantity: 1,
        image: it.image || null,
        rawProduct: it.raw || null,
      };
      cartDispatch({ type: "ADD_ITEM", payload: entry });
      // optionally remove from wishlist
      removeItem(it._id || it.id || it.productId);
      alert("Moved to cart");
      navigate("/cart");
    } catch (e) {
      console.error("moveToCart failed", e);
      alert("Failed to move to cart");
    }
  }

  if (!items || items.length === 0) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <h2 className="text-2xl font-semibold mb-4">Wishlist</h2>
        <div className="text-gray-600">Your wishlist is empty.</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h2 className="text-2xl font-semibold mb-4">Wishlist</h2>
      <div style={{ display: "grid", gap: 12 }}>
        {items.map((it) => {
          const id = it._id || it.id || it.productId;
          return (
            <div key={id} style={{ display: "flex", gap: 12, alignItems: "center", border: "1px solid #eee", padding: 12, borderRadius: 8 }}>
              <div style={{ width: 110, height: 110, display: "flex", alignItems: "center", justifyContent: "center", background: "#fafafa", borderRadius: 6 }}>
                {it.image ? <img src={it.image} alt={it.title} style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} /> : <div style={{ color: "#9ca3af" }}>No image</div>}
              </div>

              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700 }}>{it.title}</div>
                <div style={{ marginTop: 6 }}>
                  <span style={{ fontWeight: 700, color: "#166534", marginRight: 8 }}>₹{Number(it.price || 0).toLocaleString("en-IN")}</span>
                  {it.mrp ? <span style={{ textDecoration: "line-through", color: "#6b7280", marginRight: 8 }}>₹{Number(it.mrp).toLocaleString("en-IN")}</span> : null}
                </div>

                <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
                  <button onClick={() => moveToCart(it)} style={{ background: "#f59e0b", color: "#fff", padding: "8px 12px", borderRadius: 8, border: "none", cursor: "pointer" }}>Move to cart</button>
                  <button onClick={() => removeItem(id)} style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #e5e7eb", background: "#fff", cursor: "pointer" }}>Remove</button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
