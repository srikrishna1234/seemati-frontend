// src/components/CookieConsent.jsx
import React, { useEffect, useState } from "react";
import "./CookieConsent.css"; // your existing styles

// localStorage key
export const CONSENT_KEY = "seemati_cookie_consent";

export function readConsent() {
  try {
    const raw = localStorage.getItem(CONSENT_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn("Failed to read cookie consent:", e);
    return null;
  }
}

export function saveConsent(obj) {
  try {
    localStorage.setItem(CONSENT_KEY, JSON.stringify(obj));
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn("Failed to save cookie consent:", e);
  }
}

// Example analytics loader for GA (gtag). Only loads when consent is granted.
export function initAnalytics(measurementId) {
  if (!measurementId) return;
  if (window.gtag) return; // already loaded

  const s1 = document.createElement("script");
  s1.async = true;
  s1.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
  document.head.appendChild(s1);

  const s2 = document.createElement("script");
  s2.innerHTML = `window.dataLayer = window.dataLayer || []; function gtag(){dataLayer.push(arguments);} gtag('js', new Date()); gtag('config', '${measurementId}');`;
  document.head.appendChild(s2);
}

export default function CookieConsent({ measurementId = process.env.REACT_APP_GA_ID || "" }) {
  const [showBanner, setShowBanner] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [prefs, setPrefs] = useState({ analytics: false, marketing: false });

  useEffect(() => {
    const existing = readConsent();
    if (!existing) {
      setShowBanner(true);
    } else {
      if (existing.analytics && measurementId) initAnalytics(measurementId);
    }
  }, [measurementId]);

  function acceptAll() {
    const obj = { analytics: true, marketing: true, timestamp: new Date().toISOString() };
    saveConsent(obj);
    if (measurementId) initAnalytics(measurementId);
    setShowBanner(false);
  }

  function rejectNonEssential() {
    const obj = { analytics: false, marketing: false, timestamp: new Date().toISOString() };
    saveConsent(obj);
    setShowBanner(false);
  }

  function openManage() {
    const existing = readConsent();
    if (existing) setPrefs({ analytics: !!existing.analytics, marketing: !!existing.marketing });
    setShowModal(true);
  }

  function savePreferences() {
    const obj = { ...prefs, timestamp: new Date().toISOString() };
    saveConsent(obj);
    if (obj.analytics && measurementId) initAnalytics(measurementId);
    setShowModal(false);
    setShowBanner(false);
  }

  if (!showBanner && !showModal) return null;

  return (
    <>
      {showBanner && (
        <div className="cookie-consent">
          <div className="cookie-inner">
            <div className="cookie-text">
              We use cookies to improve your experience. Some are essential while others help us understand traffic and personalise offers.
            </div>

            <div className="cookie-actions">
              <button className="btn btn-accept" onClick={acceptAll}>Accept all</button>
              <button className="btn btn-reject" onClick={rejectNonEssential}>Reject non-essential</button>
              <button className="btn btn-manage" onClick={openManage}>Manage</button>
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <div className="cookie-modal-backdrop">
          <div className="cookie-modal">
            <h3>Cookie preferences</h3>
            <p className="muted">Toggle the categories you consent to. You can change this anytime from the footer link.</p>

            <div className="cookie-row">
              <div>
                <div className="cookie-title">Essential</div>
                <div className="cookie-desc">Required for the site to function.</div>
              </div>
              <div className="cookie-always">Always active</div>
            </div>

            <div className="cookie-row">
              <div>
                <div className="cookie-title">Analytics</div>
                <div className="cookie-desc">Helps us understand site usage.</div>
              </div>
              <label className="toggle">
                <input
                  type="checkbox"
                  checked={prefs.analytics}
                  onChange={(e) => setPrefs((p) => ({ ...p, analytics: e.target.checked }))}
                />
                <span className="slider" />
              </label>
            </div>

            <div className="cookie-row">
              <div>
                <div className="cookie-title">Marketing</div>
                <div className="cookie-desc">Used for personalised offers and ads.</div>
              </div>
              <label className="toggle">
                <input
                  type="checkbox"
                  checked={prefs.marketing}
                  onChange={(e) => setPrefs((p) => ({ ...p, marketing: e.target.checked }))}
                />
                <span className="slider" />
              </label>
            </div>

            <div className="cookie-modal-actions">
              <button className="btn btn-cancel" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-save" onClick={savePreferences}>Save preferences</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
