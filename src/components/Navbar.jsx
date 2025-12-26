// src/components/Navbar.jsx
import React, { useState, useEffect } from "react";
import { NavLink } from "react-router-dom";
import { useCartState } from "../context/CartContext";
import "./NavFooter.css";
import { useNavigate, useLocation } from "react-router-dom";

// ---------- Wishlist helpers ----------
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

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const { items } = useCartState(); // 👈 CONNECT TO CART
const [wishlistCount, setWishlistCount] = useState(0);
const navigate = useNavigate();
const location = useLocation();
const [search, setSearch] = useState("");

  const closeMenu = () => setOpen(false);
// sync wishlist count
useEffect(() => {
  function syncWishlist() {
    setWishlistCount(loadWishlist().length);
  }

  syncWishlist(); // initial load
  window.addEventListener("wishlist-updated", syncWishlist);

  return () => {
    window.removeEventListener("wishlist-updated", syncWishlist);
  };
}, []);

  const cartCount = Array.isArray(items)
    ? items.reduce((sum, i) => sum + (i.quantity || 1), 0)
    : 0;
const handleSearch = (e) => {
  e.preventDefault();
  if (!search.trim()) return;

  navigate(`/shop?q=${encodeURIComponent(search.trim())}`);
  setOpen(false); // close mobile menu
};

  return (
    <header className="site-nav">
      <div className="nav-inner">
        <div className="brand">
          <NavLink to="/" onClick={closeMenu} className="brand-link">
            <img src="/images/logo.png" alt="Seemati" className="brand-logo" />
            <span className="brand-text">Seemati</span>
          </NavLink>
        </div>

        <button
          className="nav-toggle"
          onClick={() => setOpen(o => !o)}
          aria-label={open ? "Close menu" : "Open menu"}
        >
          <span className={`hamburger ${open ? "open" : ""}`} />
        </button>

        <nav className={`nav-links ${open ? "open" : ""}`}>
          <NavLink to="/" onClick={closeMenu} className="nav-item">Home</NavLink>
          <NavLink to="/shop" onClick={closeMenu} className="nav-item">Shop</NavLink>
<NavLink to="/distributor">Become a Distributor</NavLink>
<form onSubmit={handleSearch} className="nav-search">
  <input
    type="search"
    placeholder="Search products"
    value={search}
    onChange={(e) => setSearch(e.target.value)}
    className="nav-search-input"
  />
</form>

          {/* ❤️ Wishlist */}
          <NavLink to="/wishlist" onClick={closeMenu} className="nav-item wishlist-link">
  ❤️
  {wishlistCount > 0 && (
    <span className="cart-count">{wishlistCount}</span>
  )}
</NavLink>

          {/* 🛒 Cart with count */}
          <NavLink to="/cart" onClick={closeMenu} className="nav-item cart-link">
            🛒
            {cartCount > 0 && (
              <span className="cart-count">{cartCount}</span>
            )}
          </NavLink>

          <NavLink to="/admin" onClick={closeMenu} className="nav-item admin-link">
            Admin
          </NavLink>
        </nav>
      </div>
    </header>
  );
}
