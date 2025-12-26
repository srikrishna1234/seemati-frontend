// src/components/Footer.jsx
import React from "react";
import { Link } from "react-router-dom";
import { useCartState } from "../context/CartContext";

export default function Footer() {
	  const { items } = useCartState();

  const cartCount = Array.isArray(items)
    ? items.reduce((sum, i) => sum + (i.quantity || 1), 0)
    : 0;

  // wishlist count from localStorage
  let wishlistCount = 0;
  try {
    const raw = localStorage.getItem("wishlist_v1");
    const arr = JSON.parse(raw || "[]");
    wishlistCount = Array.isArray(arr) ? arr.length : 0;
  } catch {}

  return (
    <footer style={{ background: "#fafafa", borderTop: "1px solid #eee", padding: "40px 16px" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 20 }}>
        <div>
          <h4 style={{ margin: "0 0 10px 0" }}>Seemati</h4>
          <p style={{ margin: 0 }}>
            Sri Krishna Apparells — Comfort-first kurti pants, palazzos & leggings.
          </p>
<p style={{ marginTop: 12 }}>
  Email: <a href="mailto:support@seemati.in">support@seemati.in</a>
</p>
        </div>

        <div>
          <h4 style={{ margin: "0 0 10px 0" }}>Quick links</h4>
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            <li><Link to="/">Home</Link></li>
            <li><Link to="/shop">Shop</Link></li>
            <li><Link to="/products">Products</Link></li>
            <li><Link to="/distributor">Distributor</Link></li>
            <li><Link to="/reviews">Reviews</Link></li>
          </ul>
        </div>

        <div>
          <h4 style={{ margin: "0 0 10px 0" }}>Help & policies</h4>
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
  <li><Link to="/faq">FAQ</Link></li>
  <li><Link to="/size-guide">Size Guide</Link></li>
  <li><Link to="/shipping">Shipping</Link></li>
  <li><Link to="/returns">Returns</Link></li>
  <li><Link to="/privacy-policy">Privacy Policy</Link></li>
  <li><Link to="/terms">Terms & Conditions</Link></li>

  <li>
    <Link to="/wishlist">
      Wishlist {wishlistCount > 0 && `(${wishlistCount})`}
    </Link>
  </li>

  <li>
    <Link to="/cart">
      Cart {cartCount > 0 && `(${cartCount})`}
    </Link>
  </li>
</ul>

        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: "26px auto 0 auto", borderTop: "1px solid #eee", paddingTop: 18, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ color: "#666" }}>
          © {new Date().getFullYear()} Sri Krishna Apparells (Seemati). All rights reserved.
        </div>
        <div style={{ color: "#999", fontSize: 14 }}>
          Made with ♥
        </div>
      </div>
    </footer>
  );
}
