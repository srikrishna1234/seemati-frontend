// src/components/Navbar.jsx
import React, { useState } from "react";
import { NavLink } from "react-router-dom";
import "./NavFooter.css";

export default function Navbar() {
  const [open, setOpen] = useState(false);

  const closeMenu = () => setOpen(false);

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
          <NavLink to="/" onClick={closeMenu} className="nav-item">
            Home
          </NavLink>

          <NavLink to="/shop" onClick={closeMenu} className="nav-item">
            Shop
          </NavLink>

          <NavLink to="/products" onClick={closeMenu} className="nav-item">
            Products
          </NavLink>

          <NavLink to="/faq" onClick={closeMenu} className="nav-item">
            FAQ
          </NavLink>

          <NavLink to="/size-guide" onClick={closeMenu} className="nav-item">
            Size Guide
          </NavLink>

          <NavLink to="/testimonials" onClick={closeMenu} className="nav-item">
            Reviews
          </NavLink>

          <NavLink to="/become-distributor" onClick={closeMenu} className="nav-item">
            Distributor
          </NavLink>

          <NavLink to="/about" onClick={closeMenu} className="nav-item">
            About
          </NavLink>

          <NavLink to="/contact" onClick={closeMenu} className="nav-item">
            Contact
          </NavLink>

          <NavLink to="/privacy-policy" onClick={closeMenu} className="nav-item nav-legal">
            Privacy
          </NavLink>

          <NavLink to="/terms" onClick={closeMenu} className="nav-item nav-legal">
            Terms
          </NavLink>

          <NavLink to="/cart" onClick={closeMenu} className="nav-item cart-link">
            Cart
          </NavLink>

          {/* Admin link (hidden on small screens; visible to admin users ideally) */}
          <NavLink to="/admin" onClick={closeMenu} className="nav-item admin-link">
            Admin
          </NavLink>
        </nav>
      </div>
    </header>
  );
}
