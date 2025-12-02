// src/home/Testimonials.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";

/**
 * Testimonials.jsx
 *
 * - Same features as before: autoplay, swipe, keyboard, accessible announcements
 * - "Write a review" modal saves locally and optionally POSTS to backend
 * - If you set REVIEW_API_URL below, component will:
 *     - GET reviews from REVIEW_API_URL on mount (expected JSON array)
 *     - POST new review to REVIEW_API_URL (backend should accept JSON body and return saved review)
 * - If backend calls fail or REVIEW_API_URL is empty, falls back to localStorage (key: 'seemati_reviews')
 * - Shows only reviews with rating >= 4; star color = #FFC107
 *
 * HOW TO ENABLE BACKEND:
 *  - Replace REVIEW_API_URL with your endpoint (e.g. 'https://api.example.com/reviews')
 *  - If your API requires auth, set AUTH_TOKEN (Bearer token) below and the component will send
 *    `Authorization: Bearer ${AUTH_TOKEN}` header.
 *
 * EXPECTED API CONTRACT (recommended):
 *  - GET  REVIEW_API_URL
 *      Response: 200 OK with JSON array of review objects:
 *      [
 *        { id, name, text, rating, photo, location, createdAt }
 *      ]
 *
 *  - POST REVIEW_API_URL
 *      Request body: JSON of new review (name, text, rating, photo?, location?, createdAt)
 *      Response: 201 Created (or 200) with saved review object (including id)
 *
 * Notes:
 *  - Ensure CORS is configured on your backend to allow your site origin.
 *  - The component handles offline / network errors by writing to localStorage.
 */

/* --- Configure backend endpoint & auth here --- */
const REVIEW_API_URL = ""; // e.g. "https://api.example.com/reviews" — leave empty to use localStorage only
const AUTH_TOKEN = ""; // e.g. "eyJhbGciOi..." if your API needs Bearer token; otherwise keep empty

/* -----------------------
   Default reviews (used if no localStorage / backend found)
   ----------------------- */
const DEFAULT_REVIEWS = [
  {
    id: "r1",
    name: "Anita Sharma",
    text:
      "Absolutely love my kurti-pant set — comfy for all-day wear and looks great. Received compliments on day one!",
    rating: 5,
    photo: "",
    location: "Hyderabad",
    createdAt: Date.now(),
  },
  {
    id: "r2",
    name: "Maya Patel",
    text:
      "Good stitch quality and accurate sizing. Delivery was prompt. Will buy again.",
    rating: 4,
    photo: "",
    location: "Bengaluru",
    createdAt: Date.now(),
  },
  {
    id: "r3",
    name: "Rekha R.",
    text:
      "Love how breathable the fabric is — perfect for summers. The palazzos have a great fall.",
    rating: 5,
    photo: "",
    location: "Chennai",
    createdAt: Date.now(),
  },
  {
    id: "r4",
    name: "Priyanka K",
    text: "Nice colours, exactly like the pictures. Good value.",
    rating: 4,
    photo: "",
    location: "Mumbai",
    createdAt: Date.now(),
  },
];

/* -----------------------
   StarRating (yellow stars)
   ----------------------- */
function StarRating({ value, size = 14 }) {
  const rounded = Math.max(0, Math.min(5, Math.round(value)));
  const stars = [];
  for (let i = 1; i <= 5; i++) {
    stars.push(
      <span
        key={i}
        aria-hidden
        style={{
          fontSize: size,
          lineHeight: 1,
          marginRight: 2,
          color: "#FFC107",
          opacity: i <= rounded ? 1 : 0.28,
        }}
      >
        ★
      </span>
    );
  }
  return (
    <div
      className="seemati-stars"
      style={{ display: "inline-flex", alignItems: "center" }}
      aria-label={`Rating: ${value} out of 5`}
    >
      {stars}
    </div>
  );
}

/* -----------------------
   Main component
   ----------------------- */
export default function Testimonials({
  autoplayInterval = 4000,
  className = "",
  localStorageKey = "seemati_reviews",
}) {
  // load reviews from localStorage (initially) or default
  const [reviews, setReviews] = useState(() => {
    try {
      const raw = typeof window !== "undefined" ? window.localStorage.getItem(localStorageKey) : null;
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      // ignore parse
    }
    return DEFAULT_REVIEWS;
  });

  // UI / carousel / modal state
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(getVisibleCount());
  const [isPlaying, setIsPlaying] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // refs
  const containerRef = useRef(null);
  const announceRef = useRef(null);
  const autoplayTimer = useRef(null);
  const dragging = useRef(false);
  const touchStartX = useRef(null);
  const touchDeltaX = useRef(0);

  /* -----------------------
     Backend: fetch on mount if REVIEW_API_URL provided
     ----------------------- */
  useEffect(() => {
    if (!REVIEW_API_URL) return; // backend not configured
    let mounted = true;
    async function fetchReviews() {
      try {
        const headers = { "Content-Type": "application/json" };
        if (AUTH_TOKEN) headers["Authorization"] = `Bearer ${AUTH_TOKEN}`;
        const res = await fetch(REVIEW_API_URL, { method: "GET", headers });
        if (!res.ok) throw new Error(`Status ${res.status}`);
        const data = await res.json();
        if (mounted && Array.isArray(data) && data.length > 0) {
          // merge: backend list will replace local copy (but we still persist it)
          setReviews(data);
          try {
            window.localStorage.setItem(localStorageKey, JSON.stringify(data));
          } catch (e) {}
        }
      } catch (err) {
        // network or CORS issue — keep using localStorage/default reviews
        // console.warn("Testimonials: failed to fetch reviews from backend", err);
      }
    }
    fetchReviews();
    return () => { mounted = false; };
  }, [localStorageKey]);

  /* -----------------------
     responsive visible count
     ----------------------- */
  useEffect(() => {
    function onResize() {
      setVisible(getVisibleCount());
    }
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  /* -----------------------
     Filter displayed reviews: only >=4
     ----------------------- */
  const displayedReviews = useMemo(() => {
    if (!reviews || reviews.length === 0) return [];
    return reviews.filter((r) => Number(r.rating) >= 4);
  }, [reviews]);

  /* -----------------------
     clamp index when displayedReviews/visible changes
     ----------------------- */
  useEffect(() => {
    if (!displayedReviews || displayedReviews.length === 0) {
      setIndex(0);
      return;
    }
    const maxStart = Math.max(0, displayedReviews.length - visible);
    if (index > maxStart) setIndex(maxStart);
  }, [visible, displayedReviews, index]);

  /* -----------------------
     Keyboard support
     ----------------------- */
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    function onKey(e) {
      if (e.key === "ArrowLeft") {
        e.preventDefault(); prev();
      } else if (e.key === "ArrowRight") {
        e.preventDefault(); next();
      } else if (e.key === " " || e.key === "Spacebar") {
        e.preventDefault(); setIsPlaying((p) => !p);
      } else if (e.key === "Escape" && isModalOpen) {
        setIsModalOpen(false);
      }
    }
    el.addEventListener("keydown", onKey);
    return () => el.removeEventListener("keydown", onKey);
  }, [isModalOpen, index, visible, displayedReviews]);

  /* -----------------------
     Autoplay (operates on displayedReviews)
     ----------------------- */
  useEffect(() => {
    if (autoplayTimer.current) {
      clearInterval(autoplayTimer.current);
      autoplayTimer.current = null;
    }
    if (!isPlaying) return;
    if (!displayedReviews || displayedReviews.length <= visible) return;

    autoplayTimer.current = setInterval(() => {
      if (dragging.current) return;
      setIndex((prev) => {
        const maxStart = Math.max(0, displayedReviews.length - visible);
        if (prev >= maxStart) return 0;
        return Math.min(maxStart, prev + visible);
      });
    }, autoplayInterval);

    return () => {
      if (autoplayTimer.current) {
        clearInterval(autoplayTimer.current);
        autoplayTimer.current = null;
      }
    };
  }, [isPlaying, autoplayInterval, displayedReviews, visible]);

  /* -----------------------
     Touch swipe for mobile
     ----------------------- */
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    function onTouchStart(e) {
      if (!e.touches || e.touches.length === 0) return;
      touchStartX.current = e.touches[0].clientX;
      touchDeltaX.current = 0;
      dragging.current = true;
      if (autoplayTimer.current) {
        clearInterval(autoplayTimer.current);
        autoplayTimer.current = null;
      }
    }
    function onTouchMove(e) {
      if (!dragging.current || !e.touches || e.touches.length === 0) return;
      touchDeltaX.current = e.touches[0].clientX - touchStartX.current;
    }
    function onTouchEnd() {
      if (!dragging.current) return;
      const dx = touchDeltaX.current;
      dragging.current = false;
      touchStartX.current = null;
      touchDeltaX.current = 0;
      const threshold = 40;
      if (dx > threshold) prev();
      else if (dx < -threshold) next();
    }

    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: true });
    el.addEventListener("touchend", onTouchEnd);
    el.addEventListener("touchcancel", onTouchEnd);

    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
      el.removeEventListener("touchcancel", onTouchEnd);
    };
  }, [displayedReviews, visible]);

  /* -----------------------
     Announce helper
     ----------------------- */
  function liveAnnounce(newIndex) {
    if (!announceRef.current) return;
    announceRef.current.textContent = `Showing reviews ${newIndex + 1} to ${Math.min(newIndex + visible, displayedReviews.length)} of ${displayedReviews.length}`;
  }

  /* -----------------------
     Prev / Next / jump
     ----------------------- */
  function prev() {
    if (!displayedReviews || displayedReviews.length === 0) return;
    const step = Math.max(1, visible);
    const nextIndex = Math.max(0, index - step);
    setIndex(nextIndex);
    liveAnnounce(nextIndex);
  }
  function next() {
    if (!displayedReviews || displayedReviews.length === 0) return;
    const step = Math.max(1, visible);
    const maxStart = Math.max(0, displayedReviews.length - visible);
    const nextIndex = Math.min(maxStart, index + step);
    setIndex(nextIndex);
    liveAnnounce(nextIndex);
  }
  function jumpToPage(pageIndex) {
    const total = displayedReviews.length;
    const newIndex = Math.min(pageIndex * visible, Math.max(0, total - visible));
    setIndex(newIndex);
    liveAnnounce(newIndex);
  }

  /* -----------------------
     Persist all reviews to localStorage
     ----------------------- */
  useEffect(() => {
    try {
      if (typeof window !== "undefined") {
        window.localStorage.setItem(localStorageKey, JSON.stringify(reviews));
      }
    } catch (e) {}
  }, [reviews, localStorageKey]);

  /* -----------------------
     JSON-LD: compute from displayedReviews (>=4 stars)
     ----------------------- */
  useEffect(() => {
    if (!displayedReviews || displayedReviews.length === 0) {
      // remove existing if present
      const existing = document.getElementById("seemati-testimonials-jsonld");
      if (existing) existing.remove();
      return;
    }
    const ratingSum = displayedReviews.reduce((s, r) => s + (Number(r.rating) || 0), 0);
    const avg = ratingSum / displayedReviews.length;
    const jsonLd = {
      "@context": "https://schema.org",
      "@type": "Product",
      "name": "Seemati Kurti Pants & Palazzos",
      "aggregateRating": {
        "@type": "AggregateRating",
        "ratingValue": String(Number(avg.toFixed(2))),
        "reviewCount": String(displayedReviews.length),
      },
    };
    const id = "seemati-testimonials-jsonld";
    const existing = document.getElementById(id);
    if (existing) existing.remove();
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.id = id;
    script.text = JSON.stringify(jsonLd);
    document.head.appendChild(script);
    return () => {
      const cur = document.getElementById(id);
      if (cur) cur.remove();
    };
  }, [displayedReviews]);

  /* -----------------------
     visible slice (for rendering)
     ----------------------- */
  const total = displayedReviews.length;
  const visibleSlice = useMemo(() => {
    if (!displayedReviews || displayedReviews.length === 0) return [];
    return displayedReviews.slice(index, index + visible);
  }, [displayedReviews, index, visible]);

  /* -----------------------
     Modal form
     ----------------------- */
  const emptyForm = { name: "", location: "", rating: 5, text: "", photo: "" };
  const [form, setForm] = useState(emptyForm);
  const [formErrors, setFormErrors] = useState({});

  function openModal() {
    setForm(emptyForm);
    setFormErrors({});
    setIsModalOpen(true);
    if (autoplayTimer.current) {
      clearInterval(autoplayTimer.current);
      autoplayTimer.current = null;
    }
  }
  function closeModal() {
    setIsModalOpen(false);
    setFormErrors({});
  }
  function validateForm() {
    const errs = {};
    if (!form.name || String(form.name).trim().length < 2) errs.name = "Please enter your name (2+ characters)";
    if (!form.text || String(form.text).trim().length < 10) errs.text = "Please write a short review (10+ characters)";
    if (!form.rating || Number(form.rating) < 1 || Number(form.rating) > 5) errs.rating = "Please choose a rating";
    return errs;
  }

  /* -----------------------
     Submit handler: optimistic UI + backend POST if configured
     ----------------------- */
  async function onSubmit(e) {
    e && e.preventDefault && e.preventDefault();
    setSubmitting(true);
    const errs = validateForm();
    if (Object.keys(errs).length > 0) {
      setFormErrors(errs);
      setSubmitting(false);
      return;
    }

    const newReviewLocal = {
      id: "r_" + Math.random().toString(36).slice(2, 9),
      name: String(form.name).trim(),
      location: String(form.location).trim(),
      text: String(form.text).trim(),
      rating: Number(form.rating),
      photo: form.photo ? String(form.photo).trim() : "",
      createdAt: Date.now(),
    };

    // Optimistically add to local state (so user sees it immediately in local list)
    setReviews((prev) => [newReviewLocal, ...prev]);

    // If backend configured, attempt POST. If success and backend returns saved item, reconcile.
    if (REVIEW_API_URL) {
      try {
        const headers = { "Content-Type": "application/json" };
        if (AUTH_TOKEN) headers["Authorization"] = `Bearer ${AUTH_TOKEN}`;
        const res = await fetch(REVIEW_API_URL, {
          method: "POST",
          headers,
          body: JSON.stringify(newReviewLocal),
        });
        if (!res.ok) throw new Error(`Status ${res.status}`);
        const saved = await res.json();
        // if backend returns the saved review (with id), replace optimistic item
        setReviews((prev) => {
          // replace first instance with matching createdAt or replace if id differs
          const replaced = prev.map((r) => {
            if (r.id === newReviewLocal.id || r.createdAt === newReviewLocal.createdAt) {
              return saved;
            }
            return r;
          });
          // if saved isn't inserted (odd backend), ensure it's present
          if (!replaced.some((r) => r.id === saved.id)) replaced.unshift(saved);
          return replaced;
        });
      } catch (err) {
        // POST failed — we keep optimistic local review and will persist to localStorage
        // console.warn("Testimonials: failed to POST review to backend", err);
      }
    }

    // After optimistic add (and backend attempt), persist done via effect.
    setTimeout(() => {
      setSubmitting(false);
      closeModal();
      setIndex(0);
      liveAnnounce(0);
    }, 250);
  }

  /* -----------------------
     UI: fallback when no displayed reviews (>=4)
     ----------------------- */
  if (!displayedReviews || displayedReviews.length === 0) {
    return (
      <section
        aria-label="Customer testimonials"
        className={`seemati-testimonials ${className}`}
        style={rootStyle}
      >
        <div style={innerStyle}>
          <h2 style={titleStyle}>Customer reviews</h2>
          <p style={{ marginTop: 8 }}>No 4+ star reviews yet — be the first to leave a great review!</p>
          <div style={{ marginTop: 12 }}>
            <button onClick={openModal} style={primaryBtnStyle}>Write a review</button>
          </div>
        </div>
      </section>
    );
  }

  /* -----------------------
     Main render
     ----------------------- */
  return (
    <>
      <section
        ref={containerRef}
        tabIndex={0}
        aria-label="Customer testimonials"
        className={`seemati-testimonials ${className}`}
        style={rootStyle}
      >
        <div style={innerStyle}>
          <div style={headerRowStyle}>
            <h2 style={titleStyle}>Customer reviews</h2>

            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <small style={{ color: "#666" }}>
                {displayedReviews.length} reviews (4★+) • avg{" "}
                {(
                  displayedReviews.reduce((s, r) => s + (Number(r.rating) || 0), 0) /
                  displayedReviews.length
                ).toFixed(1)}
                /5
              </small>

              <button
                onClick={() => setIsPlaying((p) => !p)}
                aria-pressed={!isPlaying}
                aria-label={isPlaying ? "Pause autoplay" : "Start autoplay"}
                style={controlBtnStyle}
              >
                {isPlaying ? "Pause" : "Play"}
              </button>

              <button
                onClick={() => openModal()}
                aria-label="Write a review"
                style={primaryBtnStyle}
              >
                Write a review
              </button>

              <button
                onClick={prev}
                aria-label="Previous testimonials"
                style={smallControlBtnStyle}
              >
                ←
              </button>
              <button
                onClick={next}
                aria-label="Next testimonials"
                style={smallControlBtnStyle}
              >
                →
              </button>
            </div>
          </div>

          <div
            role="list"
            aria-live="polite"
            style={{
              display: "flex",
              gap: 12,
              marginTop: 12,
              overflow: "hidden",
              alignItems: "stretch",
            }}
          >
            {visibleSlice.map((r) => (
              <article
                key={r.id}
                role="listitem"
                className="seemati-review-card"
                style={cardStyle}
              >
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <Avatar name={r.name} photo={r.photo} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                      <strong style={{ fontSize: 15 }}>{r.name}</strong>
                      {r.location ? (
                        <span style={{ fontSize: 12, color: "#666" }}>· {r.location}</span>
                      ) : null}
                    </div>
                    <div style={{ marginTop: 6 }}>
                      <StarRating value={r.rating} />
                    </div>
                  </div>
                </div>

                <p style={{ marginTop: 12, fontSize: 14, color: "#222", lineHeight: 1.4 }}>
                  {r.text}
                </p>
              </article>
            ))}
          </div>

          <div style={{ marginTop: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <small style={{ color: "#666" }}>
              Showing {index + 1}–{Math.min(index + visible, total)} of {total} reviews
            </small>

            <div aria-hidden style={{ display: "flex", gap: 6 }}>
              {Array.from({ length: Math.ceil(total / visible) }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => jumpToPage(i)}
                  aria-label={`Page ${i + 1}`}
                  className={`seemati-dot ${Math.floor(index / visible) === i ? "active" : ""}`}
                  style={{
                    width: 9,
                    height: 9,
                    borderRadius: 9,
                    border: "none",
                    background: Math.floor(index / visible) === i ? "#111" : "#ddd",
                    cursor: "pointer",
                  }}
                />
              ))}
            </div>
          </div>

          <div
            ref={announceRef}
            aria-live="polite"
            style={{
              position: "absolute",
              left: -9999,
              width: 1,
              height: 1,
              overflow: "hidden",
            }}
          />
        </div>
      </section>

      {/* Modal overlay */}
      {isModalOpen && (
        <div role="dialog" aria-modal="true" aria-labelledby="seemati-review-title" style={modalOverlayStyle}>
          <div style={modalStyle}>
            <h3 id="seemati-review-title" style={{ marginTop: 0 }}>Write a review</h3>

            <form onSubmit={onSubmit} style={{ display: "grid", gap: 10 }}>
              <label style={labelStyle}>
                Your name*
                <input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  style={inputStyle}
                  required
                />
                {formErrors.name && <div style={errorStyle}>{formErrors.name}</div>}
              </label>

              <label style={labelStyle}>
                Location (optional)
                <input
                  value={form.location}
                  onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                  style={inputStyle}
                />
              </label>

              <label style={labelStyle}>
                Rating*
                <select
                  value={form.rating}
                  onChange={(e) => setForm((f) => ({ ...f, rating: e.target.value }))}
                  style={selectStyle}
                >
                  <option value={5}>5 — Excellent</option>
                  <option value={4}>4 — Very good</option>
                  <option value={3}>3 — Good</option>
                  <option value={2}>2 — Fair</option>
                  <option value={1}>1 — Poor</option>
                </select>
                {formErrors.rating && <div style={errorStyle}>{formErrors.rating}</div>}
              </label>

              <label style={labelStyle}>
                Review*
                <textarea
                  value={form.text}
                  onChange={(e) => setForm((f) => ({ ...f, text: e.target.value }))}
                  style={textareaStyle}
                  rows={4}
                  required
                />
                {formErrors.text && <div style={errorStyle}>{formErrors.text}</div>}
              </label>

              <label style={labelStyle}>
                Photo URL (optional)
                <input
                  value={form.photo}
                  onChange={(e) => setForm((f) => ({ ...f, photo: e.target.value }))}
                  style={inputStyle}
                  placeholder="https://example.com/photo.jpg"
                />
              </label>

              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 6 }}>
                <button type="button" onClick={closeModal} style={secondaryBtnStyle}>Cancel</button>
                <button type="submit" disabled={submitting} style={primaryBtnStyle}>
                  {submitting ? "Saving…" : "Submit review"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

/* -----------------------
   Avatar + small helpers & styles
   ----------------------- */

function Avatar({ name = "User", photo }) {
  const initials = name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  if (photo) {
    return (
      <img
        src={photo}
        alt={`${name} photo`}
        style={{
          width: 56,
          height: 56,
          borderRadius: 8,
          objectFit: "cover",
          flexShrink: 0,
        }}
      />
    );
  }

  return (
    <div
      aria-hidden
      style={{
        width: 56,
        height: 56,
        borderRadius: 8,
        background: "#f2f2f2",
        color: "#111",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: 600,
        fontSize: 14,
        flexShrink: 0,
      }}
    >
      {initials}
    </div>
  );
}

function getVisibleCount() {
  const w = typeof window !== "undefined" ? window.innerWidth : 1200;
  if (w < 640) return 1;
  if (w < 980) return 2;
  return 3;
}

/* -----------------------
   Inline styles
   ----------------------- */
const rootStyle = {
  padding: "28px 12px",
  background: "#fff",
  color: "#111",
  position: "relative",
};

const innerStyle = {
  maxWidth: 1100,
  margin: "0 auto",
};

const headerRowStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
};

const titleStyle = {
  fontSize: 20,
  margin: 0,
};

const controlBtnStyle = {
  padding: "8px 12px",
  borderRadius: 8,
  border: "1px solid #e6e6e6",
  background: "#fff",
  cursor: "pointer",
  fontSize: 14,
};

const smallControlBtnStyle = {
  padding: "8px 10px",
  borderRadius: 8,
  border: "1px solid #e6e6e6",
  background: "#fff",
  cursor: "pointer",
  fontSize: 14,
};

const primaryBtnStyle = {
  padding: "8px 12px",
  borderRadius: 8,
  border: "none",
  background: "#0b6eff",
  color: "#fff",
  cursor: "pointer",
  fontSize: 14,
};

const secondaryBtnStyle = {
  padding: "8px 12px",
  borderRadius: 8,
  border: "1px solid #e6e6e6",
  background: "#fff",
  cursor: "pointer",
  fontSize: 14,
};

const cardStyle = {
  flex: "1 1 0",
  minWidth: 0,
  background: "#fbfbfb",
  padding: 14,
  borderRadius: 10,
  boxShadow: "0 1px 4px rgba(20,20,20,0.04)",
};

const modalOverlayStyle = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.35)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 1000,
  padding: 12,
};

const modalStyle = {
  width: "100%",
  maxWidth: 640,
  background: "#fff",
  borderRadius: 10,
  padding: 18,
  boxShadow: "0 6px 30px rgba(10,10,10,0.2)",
};

const labelStyle = {
  display: "block",
  fontSize: 13,
  color: "#111",
};

const inputStyle = {
  display: "block",
  width: "100%",
  padding: "8px 10px",
  marginTop: 6,
  borderRadius: 6,
  border: "1px solid #e6e6e6",
  fontSize: 14,
};

const selectStyle = {
  display: "block",
  width: "100%",
  padding: "8px 10px",
  marginTop: 6,
  borderRadius: 6,
  border: "1px solid #e6e6e6",
  fontSize: 14,
};

const textareaStyle = {
  display: "block",
  width: "100%",
  padding: "8px 10px",
  marginTop: 6,
  borderRadius: 6,
  border: "1px solid #e6e6e6",
  fontSize: 14,
};

const errorStyle = {
  marginTop: 6,
  color: "#b00020",
  fontSize: 12,
};
