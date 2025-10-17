// src/components/FreeShippingBar.jsx
import React, { useEffect, useRef, useState } from "react";
import { loadCart, computeTotals, SHIPPING_THRESHOLD } from "../utils/cartHelpers";

const DISMISS_KEY = "seemati_free_shipping_dismissed_v1";

// SMALL bottom offset => bar sits lower (closer to bottom of viewport).
const BAR_BOTTOM_OFFSET = 6; // nudged lower

// Extra buffer added to body padding (px) to ensure no overlap.
const BUFFER = 28; // slightly larger safety buffer

function formatINR(n) {
  try {
    return `₹${Number(n).toFixed(2)}`;
  } catch {
    return `₹${n}`;
  }
}

// Minimal confetti using canvas
function startConfetti(canvas) {
  if (!canvas) return null;
  const ctx = canvas.getContext("2d");
  const w = (canvas.width = canvas.clientWidth);
  const h = (canvas.height = canvas.clientHeight);
  const particles = [];
  const colors = ["#ef4444", "#f59e0b", "#10b981", "#0b5cff", "#7c3aed"];

  for (let i = 0; i < 80; i++) {
    particles.push({
      x: Math.random() * w,
      y: Math.random() * h * 0.2,
      vx: (Math.random() - 0.5) * 6,
      vy: Math.random() * 6 + 2,
      size: Math.random() * 8 + 6,
      color: colors[Math.floor(Math.random() * colors.length)],
      rot: Math.random() * Math.PI * 2,
    });
  }

  let raf = null;
  let t0 = null;
  const duration = 2000;

  function draw(ts) {
    if (!t0) t0 = ts;
    const dt = ts - t0;
    ctx.clearRect(0, 0, w, h);

    particles.forEach((p) => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.08;
      p.rot += 0.12;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
      ctx.restore();
    });

    if (dt < duration) {
      raf = requestAnimationFrame(draw);
    } else {
      setTimeout(() => {
        try {
          ctx.clearRect(0, 0, w, h);
        } catch {}
      }, 200);
    }
  }

  raf = requestAnimationFrame(draw);

  return () => {
    if (raf) cancelAnimationFrame(raf);
    try {
      ctx.clearRect(0, 0, w, h);
    } catch {}
  };
}

export default function FreeShippingBar() {
  const [visible, setVisible] = useState(() => {
    try {
      return sessionStorage.getItem(DISMISS_KEY) !== "1";
    } catch {
      return true;
    }
  });

  const [subtotal, setSubtotal] = useState(() => {
    try {
      const raw = loadCart();
      const comp = computeTotals(Array.isArray(raw) ? { items: raw } : raw);
      return comp.subtotal ?? 0;
    } catch {
      return 0;
    }
  });

  const prevQualRef = useRef(subtotal >= SHIPPING_THRESHOLD);
  const canvasRef = useRef(null);
  const confettiCleanupRef = useRef(null);
  const containerRef = useRef(null);
  const resizeObserverRef = useRef(null);

  // update subtotal when cart changes
  useEffect(() => {
    function onCartUpdated() {
      try {
        const raw = loadCart();
        const comp = computeTotals(Array.isArray(raw) ? { items: raw } : raw);
        setSubtotal(comp.subtotal ?? 0);
      } catch (e) {
        console.error("FreeShippingBar compute error:", e);
      }
    }
    window.addEventListener("cart-updated", onCartUpdated);
    window.addEventListener("storage", onCartUpdated);
    return () => {
      window.removeEventListener("cart-updated", onCartUpdated);
      window.removeEventListener("storage", onCartUpdated);
    };
  }, []);

  // confetti on threshold crossing
  useEffect(() => {
    const prevQual = prevQualRef.current;
    const nowQual = subtotal >= SHIPPING_THRESHOLD;
    if (!prevQual && nowQual) {
      try {
        if (canvasRef.current) {
          if (confettiCleanupRef.current) confettiCleanupRef.current();
          confettiCleanupRef.current = startConfetti(canvasRef.current);
          setTimeout(() => {
            if (confettiCleanupRef.current) confettiCleanupRef.current();
            confettiCleanupRef.current = null;
          }, 2600);
        }
      } catch (e) {
        console.error("confetti failed", e);
      }
    }
    prevQualRef.current = nowQual;
  }, [subtotal]);

  // ensure body padding = bar height + BUFFER (so content isn't overlapped)
  useEffect(() => {
    let canceled = false;

    function applyBodyPadding() {
      try {
        if (!visible) {
          document.body.style.paddingBottom = "";
          return;
        }
        const el = containerRef.current;
        if (!el) {
          document.body.style.paddingBottom = "";
          return;
        }
        const rect = el.getBoundingClientRect();
        // body padding equals bar height + buffer (do NOT add BAR_BOTTOM_OFFSET here)
        const pb = Math.ceil(rect.height + BUFFER);
        document.body.style.paddingBottom = pb + "px";
      } catch (e) {
        console.error("applyBodyPadding error", e);
      }
    }

    applyBodyPadding();
    window.addEventListener("resize", applyBodyPadding);
    window.addEventListener("scroll", applyBodyPadding);

    if (typeof ResizeObserver !== "undefined" && containerRef.current) {
      resizeObserverRef.current = new ResizeObserver(() => {
        applyBodyPadding();
      });
      try {
        resizeObserverRef.current.observe(containerRef.current);
      } catch (e) {}
    }

    const timer = setTimeout(() => {
      if (!canceled) applyBodyPadding();
    }, 80);

    return () => {
      canceled = true;
      clearTimeout(timer);
      window.removeEventListener("resize", applyBodyPadding);
      window.removeEventListener("scroll", applyBodyPadding);
      if (resizeObserverRef.current && containerRef.current) {
        try {
          resizeObserverRef.current.unobserve(containerRef.current);
        } catch {}
        try {
          resizeObserverRef.current.disconnect();
        } catch {}
      }
      try {
        document.body.style.paddingBottom = "";
      } catch {}
    };
  }, [visible, subtotal]);

  // cleanup confetti on unmount
  useEffect(() => {
    return () => {
      if (confettiCleanupRef.current) confettiCleanupRef.current();
      try {
        document.body.style.paddingBottom = "";
      } catch {}
    };
  }, []);

  if (!visible) return null;

  const remaining = Math.max(0, Number(SHIPPING_THRESHOLD) - Number(subtotal || 0));
  const qualifies = remaining <= 0;

  // inline styles - centered using translateX(-50%)
  const outerStyle = {
    position: "fixed",
    left: "50%",
    bottom: BAR_BOTTOM_OFFSET,
    transform: "translateX(-50%)",
    zIndex: 9999,
    display: "flex",
    justifyContent: "center",
    pointerEvents: "auto",
    width: "100%",
    paddingLeft: 12,
    paddingRight: 12,
    boxSizing: "border-box",
    transition: "bottom 180ms ease, opacity 180ms ease",
  };

  const cardStyle = {
    position: "relative",
    width: "min(960px, calc(100% - 48px))",
    borderRadius: 12,
    padding: 12,
    display: "flex",
    gap: 12,
    alignItems: "center",
    justifyContent: "space-between",
    boxShadow: "0 8px 30px rgba(2,6,23,0.12)",
    pointerEvents: "auto",
    overflow: "hidden",
    background: qualifies ? "#ecfdf5" : "#0b74ff",
    color: qualifies ? "#065f46" : "#fff",
  };

  const leftStyle = { display: "flex", gap: 12, alignItems: "center", flex: 1, minWidth: 0 };
  const headlineStyle = { fontWeight: 800, fontSize: 16, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" };
  const detailStyle = { opacity: 0.95, color: qualifies ? "#065f46" : "#eef6ff", fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" };
  const actionsStyle = { display: "flex", gap: 8, alignItems: "center", flexShrink: 0 };

  return (
    <div style={outerStyle} role="status" aria-live="polite">
      <div style={cardStyle} ref={containerRef}>
        <canvas ref={canvasRef} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }} />

        <div style={leftStyle}>
          <div style={headlineStyle}>{qualifies ? "🎉 You have free shipping!" : "Add more to get free shipping"}</div>

          <div style={detailStyle}>
            {qualifies ? `Subtotal ${formatINR(subtotal)} (Free shipping applied)` : `Add ${formatINR(remaining)} more — current subtotal ${formatINR(subtotal)}`}
          </div>
        </div>

        <div style={actionsStyle}>
          {!qualifies ? (
            <button
              onClick={() => (window.location.href = "/shop")}
              style={{
                background: "#fff",
                color: "#0b74ff",
                fontWeight: 700,
                padding: "8px 12px",
                borderRadius: 8,
                border: "none",
                cursor: "pointer",
                boxShadow: "0 2px 8px rgba(11,116,255,0.12)",
              }}
            >
              Shop now
            </button>
          ) : null}

          <button
            onClick={() => {
              try {
                sessionStorage.setItem(DISMISS_KEY, "1");
              } catch {}
              try {
                document.body.style.paddingBottom = "";
              } catch {}
              setVisible(false);
            }}
            aria-label="Dismiss free shipping message"
            style={{
              background: "transparent",
              border: "none",
              color: qualifies ? "#065f46" : "#fff",
              cursor: "pointer",
              fontWeight: 700,
              padding: "6px 8px",
            }}
          >
            Dismiss ✕
          </button>
        </div>
      </div>
    </div>
  );
}
