// src/components/Navbar.jsx
import React, { useEffect, useRef, useState, useCallback } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useCartState } from "../context/CartContext";

const WISHLIST_KEY = "wishlist_v1";

function readWishlistCount() {
  try {
    const raw = localStorage.getItem(WISHLIST_KEY) || "[]";
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.length : 0;
  } catch (e) {
    return 0;
  }
}

export function Navbar() {
  const { items } = useCartState();
  const navigate = useNavigate();
  const location = useLocation();
  const btnRef = useRef(null);

  const [wishlistCount, setWishlistCount] = useState(readWishlistCount());
  const [isAuthed, setIsAuthed] = useState(false);

  const totalQty = (items || []).reduce((sum, it) => {
    const q = Number(it?.quantity ?? it?.qty ?? 0);
    return sum + (Number.isFinite(q) ? q : 0);
  }, 0);

  useEffect(() => {
    function onWishlistUpdate() {
      setWishlistCount(readWishlistCount());
    }
    window.addEventListener("wishlist-updated", onWishlistUpdate);
    function onStorage(e) {
      if (e.key === WISHLIST_KEY) onWishlistUpdate();
    }
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("wishlist-updated", onWishlistUpdate);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  // auth check function (memoized)
  const checkAuth = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setIsAuthed(Boolean(data?.ok));
      } else {
        setIsAuthed(false);
      }
    } catch (e) {
      setIsAuthed(false);
    }
  }, []);

  // run auth check on mount AND whenever location changes
  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!mounted) return;
      await checkAuth();
    })();
    return () => { mounted = false; };
  }, [location.pathname, checkAuth]);

  // Also listen for a custom event so other parts of the app can notify auth change
  useEffect(() => {
    function handleAuthChanged() {
      checkAuth();
    }
    window.addEventListener("auth-changed", handleAuthChanged);
    return () => window.removeEventListener("auth-changed", handleAuthChanged);
  }, [checkAuth]);

  function goToCart(e, source = "ui") {
    try {
      e?.preventDefault?.();
      console.log(`[Navbar] cart clicked (${source}) - currentPath=${location.pathname}`);
    } catch (err) {
      /* ignore */
    }

    if (location.pathname === "/cart") {
      window.location.reload();
      return;
    }

    navigate("/cart");
  }

  function goToWishlist(e) {
    e?.preventDefault?.();
    if (location.pathname === "/wishlist") {
      window.location.reload();
      return;
    }
    navigate("/wishlist");
  }

  useEffect(() => {
    function onDocClickCapture(e) {
      try {
        const target = e.target;
        if (!btnRef.current) return;
        if (target && (target === btnRef.current || btnRef.current.contains(target))) {
          console.log("[Navbar] cart clicked (capture)");
          e.preventDefault?.();
          e.stopPropagation?.();
          goToCart(e, "capture");
        }
      } catch (err) {
        console.error("[Navbar] capture handler error", err);
      }
    }

    document.addEventListener("click", onDocClickCapture, true);
    return () => document.removeEventListener("click", onDocClickCapture, true);
  }, [navigate, location.pathname]);

  async function handleLogout() {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
    } catch (e) {
      console.error("Logout failed:", e);
    } finally {
      setIsAuthed(false);
      // notify other parts (optional)
      window.dispatchEvent(new Event("auth-changed"));
      navigate("/admin/login", { replace: true });
    }
  }

  return (
    <header
      style={{
        display: "flex",
        alignItems: "center",
        gap: 16,
        padding: "12px 18px",
        borderBottom: "1px solid #eee",
        background: "#fff",
        position: "relative",
        zIndex: 10000,
        pointerEvents: "auto",
      }}
    >
      <div style={{ fontWeight: 800, fontSize: 18 }}>
        <Link to="/" style={{ textDecoration: "none", color: "inherit" }}>
          Seemati
        </Link>
      </div>

      <nav style={{ marginLeft: 16 }}>
        <Link to="/" style={{ marginRight: 12 }}>
          Shop
        </Link>
        <Link to="/cart" style={{ marginRight: 12 }}>
          Cart
        </Link>
        <Link to="/admin/products">Admin</Link>
      </nav>

      <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 12 }}>
        {/* wishlist (heart) */}
        <button
          onClick={goToWishlist}
          title="Wishlist"
          aria-label={`Wishlist, ${wishlistCount} items`}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "6px 8px",
            borderRadius: 6,
            border: "1px solid transparent",
            background: "transparent",
            cursor: "pointer",
            position: "relative",
            zIndex: 10001,
            pointerEvents: "auto",
          }}
        >
          <span style={{ fontSize: 18, userSelect: "none" }}>♡</span>
          {wishlistCount ? (
            <span
              style={{
                fontWeight: 700,
                minWidth: 22,
                textAlign: "center",
                background: "#ef4444",
                color: "#fff",
                borderRadius: 999,
                padding: "2px 8px",
                fontSize: 13,
                userSelect: "none",
              }}
            >
              {wishlistCount}
            </span>
          ) : null}
        </button>

        <button
          ref={btnRef}
          onClick={(e) => goToCart(e, "button")}
          aria-label={`Cart, ${totalQty} items`}
          title="Go to cart"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "6px 8px",
            borderRadius: 6,
            border: "1px solid transparent",
            background: "transparent",
            cursor: "pointer",
            position: "relative",
            zIndex: 10001,
            pointerEvents: "auto",
          }}
        >
          <span style={{ fontSize: 18, userSelect: "none" }}>🛒</span>
          <span
            style={{
              fontWeight: 700,
              minWidth: 22,
              textAlign: "center",
              background: totalQty ? "#f97316" : "transparent",
              color: totalQty ? "#fff" : "#111",
              borderRadius: 999,
              padding: "2px 8px",
              fontSize: 13,
              userSelect: "none",
            }}
          >
            {totalQty}
          </span>
        </button>

        {/* Logout button shown when authenticated */}
        {isAuthed ? (
          <button
            onClick={handleLogout}
            title="Logout"
            style={{
              padding: "6px 12px",
              background: "#e63946",
              color: "#fff",
              border: "none",
              borderRadius: 4,
              cursor: "pointer",
            }}
          >
            Logout
          </button>
        ) : null}
      </div>
    </header>
  );
}

export default Navbar;
