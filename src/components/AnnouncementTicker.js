// frontend/src/components/AnnouncementTicker.js
import React, { useEffect, useRef, useState } from 'react';
import './AnnouncementTicker.css';

const API_BASE = process.env.REACT_APP_API_URL || '';

export default function AnnouncementTicker({ messages: initialMessages = [] }) {
  const [messages, setMessages] = useState(initialMessages);
  const [loading, setLoading] = useState(true);

  const sampleRef = useRef(null);      // measure one item
  const containerRef = useRef(null);   // the moving .ticker element
  const wrapperRef = useRef(null);     // the clipped wrapper .ticker-wrap
  const [copies, setCopies] = useState(2);
  const [duration, setDuration] = useState(18); // seconds

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const res = await fetch(`${API_BASE}/admin-api/settings/announcements`);
        if (!res.ok) throw new Error('Failed to load announcements');
        const data = await res.json();
        if (!mounted) return;
        setMessages(Array.isArray(data.messages) ? data.messages : []);
      } catch (err) {
        if (mounted) setMessages(initialMessages || []);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, [initialMessages]);

  // compute number of copies and duration after messages render
  useEffect(() => {
    if (!messages || messages.length === 0) return;

    let raf = 0;
    function compute() {
      const sample = sampleRef.current;
      const wrapper = wrapperRef.current;
      if (!sample || !wrapper) {
        raf = requestAnimationFrame(compute);
        return;
      }

      const itemWidth = Math.max(1, sample.getBoundingClientRect().width);
      const viewport = Math.max(window.innerWidth || 1024, 600);
      const desiredTotalWidth = viewport + itemWidth;
      const needed = Math.ceil(desiredTotalWidth / itemWidth) + 1;
      setCopies(needed);

      const movingWidth = itemWidth * needed;
      const distance = movingWidth + viewport;
      const pxPerSecond = 110; // higher = faster
      const sec = Math.max(8, Math.min(60, Math.round(distance / pxPerSecond)));
      setDuration(sec);
    }

    raf = requestAnimationFrame(compute);
    window.addEventListener('resize', compute);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', compute);
    };
  }, [messages]);

  // Pause on touch/focus for mobile & keyboard accessibility
  useEffect(() => {
    const wrapper = wrapperRef.current;
    const ticker = containerRef.current;
    if (!wrapper || !ticker) return;

    const touchStart = () => ticker.classList.add('paused');
    const touchEnd = () => ticker.classList.remove('paused');
    const focusIn = () => ticker.classList.add('paused');
    const focusOut = () => ticker.classList.remove('paused');

    wrapper.addEventListener('touchstart', touchStart, { passive: true });
    wrapper.addEventListener('touchend', touchEnd);
    wrapper.addEventListener('touchcancel', touchEnd);
    wrapper.addEventListener('focusin', focusIn);
    wrapper.addEventListener('focusout', focusOut);

    return () => {
      wrapper.removeEventListener('touchstart', touchStart);
      wrapper.removeEventListener('touchend', touchEnd);
      wrapper.removeEventListener('touchcancel', touchEnd);
      wrapper.removeEventListener('focusin', focusIn);
      wrapper.removeEventListener('focusout', focusOut);
    };
  }, [messages]);

  if (!messages || messages.length === 0 || loading) return null;

  const text = messages.join('  •  ');

  const items = Array.from({ length: copies }).map((_, i) => (
    <div key={i} className="ticker__item" ref={i === 0 ? sampleRef : null}>
      {text}
    </div>
  ));

  return (
    <div
      className="ticker-wrap"
      role="region"
      aria-label="Announcements"
      tabIndex={0}                // make focusable for keyboard users
      ref={wrapperRef}
    >
      <div
        className="ticker"
        ref={containerRef}
        style={{ animationDuration: `${duration}s` }}
      >
        {items}
      </div>
    </div>
  );
}
