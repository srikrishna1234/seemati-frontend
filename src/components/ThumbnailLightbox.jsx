// src/components/ThumbnailLightbox.jsx
import React, { useEffect, useState, useCallback } from "react";

/**
 * ThumbnailLightbox
 * Props:
 *  - images: array of image URLs (strings)
 *  - startIndex: number (initial image index)
 *  - onClose: function()
 *
 * Usage:
 * <ThumbnailLightbox images={imgs} startIndex={i} onClose={() => setOpen(false)} />
 */
export default function ThumbnailLightbox({ images = [], startIndex = 0, onClose }) {
  const [index, setIndex] = useState(Math.max(0, Math.min(startIndex, images.length - 1)));
  const [zoom, setZoom] = useState(false);

  useEffect(() => {
    setIndex(Math.max(0, Math.min(startIndex, images.length - 1)));
  }, [startIndex, images.length]);

  const prev = useCallback(() => setIndex((i) => (i <= 0 ? images.length - 1 : i - 1)), [images.length]);
  const next = useCallback(() => setIndex((i) => (i >= images.length - 1 ? 0 : i + 1)), [images.length]);

  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") return onClose && onClose();
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, prev, next]);

  if (!images || images.length === 0) return null;

  return (
    <div style={overlayStyle} onMouseDown={(e) => { if (e.target === e.currentTarget) onClose && onClose(); }}>
      <div style={modalStyle} role="dialog" aria-modal="true">
        <button onClick={onClose} aria-label="Close" style={closeBtnStyle}>✕</button>

        <button onClick={prev} aria-label="Previous" style={{ ...navBtnStyle, left: 12 }}>&larr;</button>
        <div
          style={imgWrapStyle}
          onMouseEnter={() => setZoom(true)}
          onMouseLeave={() => setZoom(false)}
        >
          <img
            src={images[index]}
            alt={`Preview ${index + 1}`}
            style={{
              maxWidth: "100%",
              maxHeight: "100%",
              width: "auto",
              height: "auto",
              transform: zoom ? "scale(1.25)" : "scale(1)",
              transition: "transform 260ms ease",
              objectFit: "contain",
            }}
            draggable={false}
            onClick={(e) => { /* disable default */ e.stopPropagation(); }}
          />
        </div>
        <button onClick={next} aria-label="Next" style={{ ...navBtnStyle, right: 12 }}>&rarr;</button>

        <div style={captionStyle}>
          <span>{index + 1} / {images.length}</span>
        </div>
      </div>
    </div>
  );
}

// Styles
const overlayStyle = {
  position: "fixed",
  inset: 0,
  background: "rgba(12,12,12,0.65)",
  zIndex: 9999,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 20,
};

const modalStyle = {
  position: "relative",
  width: "min(95vw, 1100px)",
  maxHeight: "90vh",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const imgWrapStyle = {
  flex: "1 1 auto",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  maxHeight: "80vh",
  overflow: "hidden",
  borderRadius: 8,
  background: "#fff",
  padding: 16,
  boxSizing: "border-box",
};

const navBtnStyle = {
  position: "absolute",
  top: "50%",
  transform: "translateY(-50%)",
  background: "rgba(255,255,255,0.9)",
  border: "none",
  borderRadius: 6,
  width: 40,
  height: 40,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  fontSize: 18,
  boxShadow: "0 3px 10px rgba(0,0,0,0.2)",
};

const closeBtnStyle = {
  position: "absolute",
  right: -6,
  top: -6,
  background: "#fff",
  border: "none",
  width: 36,
  height: 36,
  borderRadius: "50%",
  cursor: "pointer",
  fontSize: 16,
  boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
};

const captionStyle = {
  position: "absolute",
  bottom: 8,
  left: "50%",
  transform: "translateX(-50%)",
  color: "#fff",
  fontSize: 13,
  background: "rgba(0,0,0,0.35)",
  padding: "6px 10px",
  borderRadius: 8,
};
