// src/utils/wishlistAnimation.js
// Reusable wishlist visual helpers:
// - triggerHeartBurst(el, count) -> small burst near element
// - triggerImageBurst(containerEl, options) -> larger burst inside product image area
// - pulseElement(el) -> quick pulse (scale) for badges/icons

export function triggerHeartBurst(targetEl = null, count = 14) {
  try {
    const container = document.body;
    const rect = (targetEl && targetEl.getBoundingClientRect && targetEl.getBoundingClientRect()) || { left: 0, top: 0, width: window.innerWidth, height: 80 };

    const wrapper = document.createElement("div");
    wrapper.style.position = "fixed";
    const x = rect.left + (rect.width / 2) - 20;
    const y = rect.top + (rect.height / 2) - 20;
    wrapper.style.left = `${Math.max(8, x)}px`;
    wrapper.style.top = `${Math.max(8, y)}px`;
    wrapper.style.width = "40px";
    wrapper.style.height = "40px";
    wrapper.style.pointerEvents = "none";
    wrapper.style.zIndex = "999999";
    container.appendChild(wrapper);

    for (let i = 0; i < count; i++) {
      const el = document.createElement("div");
      const size = 8 + Math.floor(Math.random() * 12);
      el.style.position = "absolute";
      el.style.left = "50%";
      el.style.top = "50%";
      el.style.transform = "translate(-50%,-50%)";
      el.style.width = `${size}px`;
      el.style.height = `${size}px`;
      el.style.display = "flex";
      el.style.alignItems = "center";
      el.style.justifyContent = "center";
      el.style.fontSize = `${Math.max(10, Math.floor(size * 0.9))}px`;
      el.style.color = "#ef4444";
      el.style.opacity = "1";
      el.style.pointerEvents = "none";
      el.style.userSelect = "none";
      el.textContent = "♥";
      wrapper.appendChild(el);

      const angle = Math.random() * Math.PI * 2;
      const dist = 30 + Math.random() * 80;
      const vx = Math.cos(angle) * dist;
      const vy = Math.sin(angle) * dist - 6 * Math.random();

      const start = performance.now() + Math.random() * 120;
      const dur = 650 + Math.random() * 500;

      (function animate(pEl, vx, vy, start, dur) {
        function frame(t) {
          const dt = t - start;
          if (dt < 0) {
            requestAnimationFrame(frame);
            return;
          }
          const p = Math.min(1, dt / dur);
          const ease = 1 - Math.pow(1 - p, 3);
          pEl.style.transform = `translate(${vx * ease - 20}px, ${vy * ease - 20}px) scale(${1 - 0.6 * ease})`;
          pEl.style.opacity = String(1 - ease);
          if (p < 1) requestAnimationFrame(frame);
          else setTimeout(() => { try { pEl.remove(); } catch {} }, 20);
        }
        requestAnimationFrame(frame);
      })(el, vx, vy, start, dur);
    }

    setTimeout(() => { try { wrapper.remove(); } catch {} }, 1700);
  } catch (e) {
    console.warn("triggerHeartBurst failed", e);
  }
}

export function triggerImageBurst(containerEl = null, count = 36, spread = 220, lifetime = 1000) {
  try {
    if (!containerEl || !containerEl.getBoundingClientRect) {
      containerEl = document.body;
    }
    const rect = containerEl.getBoundingClientRect();
    const wrapper = document.createElement("div");
    wrapper.style.position = "absolute";
    wrapper.style.left = `${rect.left + window.scrollX}px`;
    wrapper.style.top = `${rect.top + window.scrollY}px`;
    wrapper.style.width = `${rect.width}px`;
    wrapper.style.height = `${rect.height}px`;
    wrapper.style.pointerEvents = "none";
    wrapper.style.overflow = "visible";
    wrapper.style.zIndex = 999999;
    document.body.appendChild(wrapper);

    const cx = rect.width / 2;
    const cy = rect.height / 2;
    const particles = [];

    for (let i = 0; i < count; i++) {
      const el = document.createElement("div");
      const size = Math.floor(Math.random() * 10) + 6;
      el.style.position = "absolute";
      el.style.left = `${cx - size / 2}px`;
      el.style.top = `${cy - size / 2}px`;
      el.style.width = `${size}px`;
      el.style.height = `${size}px`;
      el.style.borderRadius = "4px";
      el.style.background = ["#f59e0b", "#ef4444", "#10b981", "#0b5cff", "#7c3aed"][Math.floor(Math.random()*5)];
      el.style.opacity = "1";
      el.style.transform = "translate3d(0,0,0) scale(1)";
      el.style.willChange = "transform, opacity";
      wrapper.appendChild(el);

      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * (spread / 30);
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed - Math.random() * 1.5;
      const rot = (Math.random() - 0.5) * 10;
      particles.push({ el, x: cx, y: cy, vx, vy, rot });
    }

    const start = performance.now();
    function frame(t) {
      const dt = t - start;
      const norm = Math.min(1, dt / lifetime);
      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.06;
        const scale = 1 - norm * 0.6;
        p.el.style.transform = `translate3d(${p.x - cx}px, ${p.y - cy}px, 0) rotate(${p.rot * norm}deg) scale(${Math.max(0.2, scale)})`;
        p.el.style.opacity = String(1 - norm);
      });
      if (norm < 1) requestAnimationFrame(frame);
      else setTimeout(() => { try { wrapper.remove(); } catch {} }, 60);
    }
    requestAnimationFrame(frame);
  } catch (e) {
    console.warn("triggerImageBurst failed", e);
  }
}

export function pulseElement(el, duration = 420) {
  try {
    if (!el) return;
    const orig = el.style.transform || "";
    el.style.transition = `transform ${Math.min(250, duration/2)}ms cubic-bezier(.2,.9,.2,1)`;
    el.style.transform = "scale(1.15)";
    setTimeout(() => {
      el.style.transform = orig;
      setTimeout(() => {
        // cleanup
        try { el.style.transition = ""; } catch {}
      }, duration/2 + 20);
    }, duration/2);
  } catch (e) {
    // ignore
  }
}

export default {
  triggerHeartBurst,
  triggerImageBurst,
  pulseElement,
};
