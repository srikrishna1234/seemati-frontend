// src/pages/Home.jsx
import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import ShopProductCard from "../shop/shopProductCard";

/*
  Home.jsx (plain CSS via inline style objects)
  - Uses images from /images/ (public/images)
  - No Tailwind required
*/

let axiosInstance = null;
try {
  // eslint-disable-next-line global-require
  axiosInstance = require("../api/axiosInstance").default;
} catch (e) {
  axiosInstance = null;
}

const HERO_SLIDES = [
  { id: 1, image: "/images/hero-1.jpg", subtitle: "Comfort-first kurti pants and palazzos — made for every day", cta: { text: "Shop New", href: "/shop?filter=new" } },
  { id: 2, image: "/images/hero-2.jpg", subtitle: "Flat 10% off on prepaid — limited time", cta: { text: "Shop Offers", href: "/shop?offer=prepaid" } },
  { id: 3, image: "/images/hero-3.jpg", subtitle: "Breathable cotton & rayon — lightweight and stylish", cta: { text: "Explore Fabrics", href: "/shop?category=fabric" } },
];

const CATEGORIES = [
  { key: "kurti-pant", label: "Kurti Pants", img: "/images/cat-kurti.png" },
  { key: "palazzo", label: "Palazzos", img: "/images/cat-palazzo.png" },
  { key: "sets", label: "Kurti Sets", img: "/images/cat-sets.png" },
  { key: "new", label: "New Arrivals", img: "/images/cat-new.png" },
  { key: "best", label: "Best Sellers", img: "/images/cat-best.png" },
];

// ---- inline styles ----
const styles = {
  page: { fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial", color: "#111", background: "#fff" },
  container: { maxWidth: 1200, margin: "0 auto", padding: "18px" },
  heroWrap: { position: "relative", overflow: "hidden", background: "#222" },
  heroViewport: { width: "100%", height: 520, maxHeight: "60vh" /* fits tall screens */, position: "relative" },
  heroSlide: (active) => ({
    position: "absolute",
    top: 0, left: 0, right: 0, bottom: 0,
    transition: "opacity 600ms ease",
    opacity: active ? 1 : 0,
    zIndex: active ? 2 : 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-start",
  }),
  heroImage: { width: "100%", height: "100%", objectFit: "cover", display: "block", maxHeight: 520 },
  heroOverlay: { position: "absolute", inset: 0, backgroundColor: "rgba(0,0,0,0.28)", display: "flex", alignItems: "center" },
  heroContent: { color: "#fff", maxWidth: 560, padding: "28px" },
  heroTitle: { fontSize: 36, fontWeight: 800, margin: 0, lineHeight: 1.05 },
  heroSubtitle: { marginTop: 10, fontSize: 16, color: "#f3f3f3" },
  ctaPrimary: { background: "#6a0dad", color: "#fff", padding: "10px 18px", borderRadius: 8, fontWeight: 700, border: "none", cursor: "pointer", marginRight: 8 },
  ctaSecondary: { background: "#fff", color: "#222", padding: "8px 14px", borderRadius: 8, textDecoration: "none", fontWeight: 600 },
  heroControls: { position: "absolute", bottom: 14, left: "50%", transform: "translateX(-50%)", display: "flex", gap: 8, zIndex: 40 },
  dot: (active) => ({ width: 28, height: 6, borderRadius: 6, background: active ? "#fff" : "rgba(255,255,255,0.5)", border: "none", cursor: "pointer" }),

  // categories
  categoriesWrap: { margin: "22px 0", padding: "8px 0" },
  categoriesRow: { display: "flex", gap: 12, overflowX: "auto", paddingBottom: 6 },
  categoryCard: { minWidth: 110, textAlign: "center", flex: "0 0 auto", cursor: "pointer" },
  categoryIconWrap: { width: 88, height: 88, margin: "0 auto", borderRadius: 10, background: "#f7f7f7", display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid #eee" },
  categoryIcon: { maxHeight: 56, objectFit: "contain" },
  categoryLabel: { marginTop: 8, fontSize: 14, color: "#333" },

  // promos
  promosGrid: { display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12, alignItems: "stretch", marginTop: 12 },
  promoCard: { borderRadius: 10, overflow: "hidden", background: "#fff", boxShadow: "0 6px 18px rgba(0,0,0,0.06)" },
  promoImage: { width: "100%", height: 200, objectFit: "cover", display: "block" },
  promoBody: { padding: 14 },

  // lists
  sectionHeader: { display: "flex", justifyContent: "space-between", alignItems: "baseline", margin: "20px 0 10px" },
  sectionTitle: { fontSize: 20, fontWeight: 700 },

  // scroller
  scrollerWrap: { position: "relative" },
  scrollerInner: { display: "flex", gap: 12, overflowX: "auto", padding: "6px 4px" },
  scrollerButton: { position: "absolute", top: "50%", transform: "translateY(-50%)", background: "#fff", borderRadius: 999, padding: 8, border: "1px solid #eee", cursor: "pointer", boxShadow: "0 4px 12px rgba(0,0,0,0.06)" },

  // footer
  footer: { marginTop: 32, borderTop: "1px solid #eee", paddingTop: 16, color: "#444", fontSize: 13 },
};

export default function Home() {
  const [featured, setFeatured] = useState([]);
  const [bestsellers, setBestsellers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [heroIndex, setHeroIndex] = useState(0);
  const heroTimer = useRef(null);

  // fetch small previews (safe fallback if backend unavailable)
  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const endpointNew = "/api/products?limit=8&sort=createdAt_desc";
        const endpointBest = "/api/products?limit=8&sort=popularity_desc";
        if (axiosInstance) {
          const [fR, bR] = await Promise.all([axiosInstance.get(endpointNew), axiosInstance.get(endpointBest)]);
          const fData = fR?.data ?? fR;
          const bData = bR?.data ?? bR;
          const fItems = Array.isArray(fData) ? fData : (fData.docs ?? fData.products ?? fData.data ?? []);
          const bItems = Array.isArray(bData) ? bData : (bData.docs ?? bData.products ?? bData.data ?? []);
          if (!cancelled) {
            setFeatured(Array.isArray(fItems) ? fItems.slice(0, 8) : []);
            setBestsellers(Array.isArray(bItems) ? bItems.slice(0, 8) : []);
          }
        } else {
          const [rf, rb] = await Promise.all([fetch(endpointNew), fetch(endpointBest)]);
          if (rf.ok && rb.ok) {
            const jf = await rf.json();
            const jb = await rb.json();
            const fItems = Array.isArray(jf) ? jf : (jf.docs ?? jf.products ?? jf.data ?? []);
            const bItems = Array.isArray(jb) ? jb : (jb.docs ?? jb.products ?? jb.data ?? []);
            if (!cancelled) {
              setFeatured(Array.isArray(fItems) ? fItems.slice(0, 8) : []);
              setBestsellers(Array.isArray(bItems) ? bItems.slice(0, 8) : []);
            }
          }
        }
      } catch (err) {
        console.error("home load error", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  // hero timer
  useEffect(() => {
    startTimer();
    return stopTimer;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [heroIndex]);

  function startTimer() {
    stopTimer();
    heroTimer.current = setInterval(() => {
      setHeroIndex((i) => (i + 1) % HERO_SLIDES.length);
    }, 5000);
  }
  function stopTimer() {
    if (heroTimer.current) {
      clearInterval(heroTimer.current);
      heroTimer.current = null;
    }
  }

  // product scroller component
  function ProductScroller({ items = [] }) {
    const ref = useRef(null);
    const scrollLeft = () => ref.current?.scrollBy({ left: -260, behavior: "smooth" });
    const scrollRight = () => ref.current?.scrollBy({ left: 260, behavior: "smooth" });
    return (
      <div style={{ position: "relative" }}>
        <button onClick={scrollLeft} aria-label="scroll left" style={{ ...styles.scrollerButton, left: -8 }}>‹</button>
        <div ref={ref} style={styles.scrollerInner}>
          {items.map((p) => (
            <div key={p._id ?? p.slug ?? p.id} style={{ minWidth: 220, flex: "0 0 auto" }}>
              <ShopProductCard product={p} />
            </div>
          ))}
        </div>
        <button onClick={scrollRight} aria-label="scroll right" style={{ ...styles.scrollerButton, right: -8 }}>›</button>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        {/* HERO */}
        <section style={styles.heroWrap} onMouseEnter={stopTimer} onMouseLeave={startTimer}>
          <div style={styles.heroViewport}>
            {HERO_SLIDES.map((s, idx) => {
              const active = idx === heroIndex;
              return (
                <div key={s.id} style={styles.heroSlide(active)} aria-hidden={!active}>
                  <img src={s.image} alt={s.subtitle || "Seemati hero"} style={styles.heroImage} />
                  <div style={styles.heroOverlay}>
                    <div style={styles.heroContent}>
                      <h1 style={styles.heroTitle}>Seemati — Confident &amp; Stylish</h1>
                      <p style={styles.heroSubtitle}>{s.subtitle}</p>
                      <div style={{ marginTop: 14 }}>
                        <Link to={s.cta.href}><button style={styles.ctaPrimary}>{s.cta.text}</button></Link>
                        <Link to="/shop"><span style={styles.ctaSecondary}>Browse all</span></Link>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            <div style={styles.heroControls}>
              {HERO_SLIDES.map((_, i) => (
                <button key={i} aria-label={`Slide ${i + 1}`} onClick={() => setHeroIndex(i)} style={styles.dot(i === heroIndex)} />
              ))}
            </div>
          </div>
        </section>

        {/* CATEGORIES */}
        <section style={styles.categoriesWrap}>
          <div style={styles.categoriesRow}>
            {CATEGORIES.map((c) => (
              <Link key={c.key} to={`/shop?category=${c.key}`} style={styles.categoryCard}>
                <div style={styles.categoryIconWrap}>
                  <img src={c.img} alt={c.label} style={styles.categoryIcon} />
                </div>
                <div style={styles.categoryLabel}>{c.label}</div>
              </Link>
            ))}
          </div>
        </section>

        {/* PROMOS */}
        <section>
          <div style={styles.promosGrid}>
            <div style={{ display: "grid", gap: 12 }}>
              <div style={styles.promoCard}>
                <img src="/images/promo-1.jpg" alt="promo 1" style={styles.promoImage} />
                <div style={styles.promoBody}>
                  <div style={{ fontWeight: 700, fontSize: 16 }}>Bulk Discounts</div>
                  <div style={{ color: "#666", marginTop: 6 }}>Special pricing for bulk & wholesale orders.</div>
                  <div style={{ marginTop: 10 }}><Link to="/shop">Learn more →</Link></div>
                </div>
              </div>
              <div style={styles.promoCard}>
                <img src="/images/promo-2.jpg" alt="promo 2" style={styles.promoImage} />
                <div style={styles.promoBody}>
                  <div style={{ fontWeight: 700, fontSize: 16 }}>New Fabric Drop</div>
                  <div style={{ color: "#666", marginTop: 6 }}>Lightweight rayons and soft cotton blends.</div>
                  <div style={{ marginTop: 10 }}><Link to="/shop?category=fabric">Shop fabrics →</Link></div>
                </div>
              </div>
            </div>

            <div style={{ ...styles.promoCard, padding: 18, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontWeight: 800 }}>Free shipping above ₹999</div>
                <div style={{ color: "#666", marginTop: 8 }}>Add items to your cart — shipping calculated at checkout.</div>
              </div>
              <div style={{ marginTop: 12 }}>
                <Link to="/shop"><button style={{ ...styles.ctaPrimary, padding: "10px 14px" }}>Start Shopping</button></Link>
              </div>
            </div>
          </div>
        </section>

        {/* NEW ARRIVALS */}
        <section style={{ marginTop: 22 }}>
          <div style={styles.sectionHeader}>
            <div style={styles.sectionTitle}>New arrivals</div>
            <div><Link to="/shop?filter=new">View all</Link></div>
          </div>
          <div>{loading ? <div>Loading…</div> : <ProductScroller items={featured.slice(0, 8)} />}</div>
        </section>

        {/* BESTSELLERS */}
        <section style={{ marginTop: 18 }}>
          <div style={styles.sectionHeader}>
            <div style={styles.sectionTitle}>Best sellers</div>
            <div><Link to="/shop?sort=popular">Explore</Link></div>
          </div>
          <div>{bestsellers.length === 0 ? <div style={{ color: "#777" }}>No best sellers yet.</div> : <ProductScroller items={bestsellers.slice(0, 8)} />}</div>
        </section>

        {/* CTA / Newsletter */}
        <section style={{ marginTop: 28, background: "#6a0dad", color: "#fff", borderRadius: 10 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px" }}>
            <div>
              <div style={{ fontWeight: 800, fontSize: 18 }}>Join Seemati — 10% OFF</div>
              <div style={{ marginTop: 6 }}>Subscribe for early access to new drops and exclusive offers.</div>
            </div>
            <form onSubmit={(e) => e.preventDefault()} style={{ display: "flex", gap: 8 }}>
              <input aria-label="Email" placeholder="Your email address" type="email" style={{ padding: "8px 10px", borderRadius: 6, border: "none", width: 220 }} />
              <button type="button" style={{ padding: "8px 12px", borderRadius: 6, border: "none", background: "#fff", color: "#6a0dad", fontWeight: 700, cursor: "pointer" }}>Subscribe</button>
            </form>
          </div>
        </section>

        {/* footer */}
        <footer style={styles.footer}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 20 }}>
            <div>
              <div style={{ fontWeight: 700 }}>Seemati</div>
              <div style={{ marginTop: 8, color: "#666" }}>Comfort-forward kurti pants, palazzos & sets. GST invoice available.</div>
            </div>
            <div>
              <div style={{ fontWeight: 700 }}>Customer care</div>
              <div style={{ marginTop: 8 }}>
                <div><Link to="/contact">Contact us</Link></div>
                <div style={{ marginTop: 6 }}><Link to="/returns">Returns & Refunds</Link></div>
                <div style={{ marginTop: 6 }}><Link to="/shipping">Shipping</Link></div>
              </div>
            </div>
            <div>
              <div style={{ fontWeight: 700 }}>Quick links</div>
              <div style={{ marginTop: 8 }}>
                <div><Link to="/shop">Shop</Link></div>
                <div style={{ marginTop: 6 }}><Link to="/shop?category=kurti-pant">Kurti Pants</Link></div>
                <div style={{ marginTop: 6 }}><Link to="/admin/login">Admin</Link></div>
              </div>
            </div>
          </div>

          <div style={{ marginTop: 16, borderTop: "1px solid #eee", paddingTop: 12, fontSize: 12, color: "#777" }}>
            © {new Date().getFullYear()} Sri Krishna Apparells — Seemati. All rights reserved.
          </div>
        </footer>
      </div>
    </div>
  );
}
