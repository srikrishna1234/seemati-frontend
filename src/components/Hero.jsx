// src/components/Hero.jsx
import React from "react";
import { Link } from "react-router-dom";
import "./Hero.css";

/**
 * Simple Hero component (drop-in)
 * - Uses public/hero.jpg by default (put your hero image in public/hero.jpg)
 * - Renders title, subtitle and two CTAs
 * - Renders a thumbnail row below the hero so it doesn't overlap
 *
 * If you already have an image URL, you can pass it as `imageUrl` prop.
 */

export default function Hero({ imageUrl = "/hero.jpg", title = "Seemati — Confident & Stylish", subtitle = "Comfort-first kurti pants and palazzos — made for every day" }) {
  // sample thumbnails (replace with your generated thumbnails or map real items)
  const thumbs = [
    "/thumbs/1.jpg",
    "/thumbs/2.jpg",
    "/thumbs/3.jpg",
    "/thumbs/4.jpg",
    "/thumbs/5.jpg",
  ];

  return (
    <div className="app-hero-wrapper">
      <section
        className="home-hero restored-hero"
        style={{
          backgroundImage: `url(${imageUrl})`,
        }}
        aria-label="Seemati hero"
      >
        <div className="hero-overlay">
          <h1 className="hero-title">{title}</h1>
          <p className="hero-sub">{subtitle}</p>

          <div className="hero-ctas">
            <Link to="/shop" className="btn-primary">Explore Fabrics</Link>
            <Link to="/shop" className="btn-outline">Browse all</Link>
          </div>
        </div>
      </section>

      {/* Thumbnails row — if your old home had small product thumbs here, they'll appear */}
      <section className="hero-thumbnails restored-thumbs" aria-hidden>
        <div className="thumbs-row">
          {thumbs.map((t, i) => (
            <div key={i} className="thumb">
              <img src={t} alt={`thumb-${i}`} onError={(e)=>{ e.currentTarget.style.opacity = 0.06; }} />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
