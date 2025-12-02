// src/home/NewsletterSignup.jsx
import React, { useEffect, useState } from "react";

/**
 * NewsletterSignup.jsx
 *
 * - Simple newsletter signup component with three modes:
 *    1) Backend POST -> set NEWSLETTER_API_URL to your endpoint (expects JSON { name?, email })
 *    2) Mailchimp form -> set MAILCHIMP_FORM_ACTION to your Mailchimp form action URL (embed form action)
 *    3) Local fallback -> saves to localStorage (key: 'seemati_newsletter')
 *
 * - Usage:
 *    import NewsletterSignup from "../home/NewsletterSignup";
 *    <NewsletterSignup />
 *
 * - Configuration: edit the constants below.
 *
 * NOTES:
 *  - If using Mailchimp, use the "Embedded form" action URL (it usually looks like
 *    https://<dc>.list-manage.com/subscribe/post?u=XXXXX&id=YYYYY). This will open a new tab/window
 *    with Mailchimp's response page (you won't get a programmatic success response).
 *
 *  - If using a backend API, ensure CORS allows your site origin. The component sends a JSON POST.
 *
 *  - Local fallback stores subscriber objects in localStorage for later export.
 */

/* ---------- CONFIGURATION: set one or both as needed ---------- */
const NEWSLETTER_API_URL = ""; // e.g. "https://api.seemati.com/newsletter/subscribe" (POST JSON)
const NEWSLETTER_API_AUTH = ""; // optional Authorization token (Bearer) if your backend needs it

// If you prefer Mailchimp embedded form, paste the form ACTION URL here.
// Example: "https://abcd1234.list-manage.com/subscribe/post?u=XXXX&id=YYYY"
const MAILCHIMP_FORM_ACTION = ""; // leave empty if not using Mailchimp

/* ---------- End config ---------- */

const LOCAL_STORAGE_KEY = "seemati_newsletter";

function isEmailValid(email) {
  if (!email) return false;
  // gentle email regex — good enough for client-side validation
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).trim());
}

export default function NewsletterSignup({ className = "" }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("idle"); // idle | saving | success | error
  const [message, setMessage] = useState("");

  useEffect(() => {
    // optionally prefill email if user visited before
    try {
      const raw = window.localStorage.getItem("seemati_last_email");
      if (raw) setEmail(raw);
    } catch (e) {}
  }, []);

  async function handleSubmit(e) {
    e && e.preventDefault && e.preventDefault();
    setMessage("");
    if (!isEmailValid(email)) {
      setMessage("Please enter a valid email address.");
      return;
    }
    setStatus("saving");

    // Mode 1: Backend API POST (preferred)
    if (NEWSLETTER_API_URL) {
      try {
        const headers = { "Content-Type": "application/json" };
        if (NEWSLETTER_API_AUTH) headers["Authorization"] = `Bearer ${NEWSLETTER_API_AUTH}`;
        const res = await fetch(NEWSLETTER_API_URL, {
          method: "POST",
          headers,
          body: JSON.stringify({ name: name ? String(name).trim() : undefined, email: String(email).trim() }),
        });
        if (!res.ok) {
          // try reading body for error message
          let text = "";
          try { text = await res.text(); } catch (err) {}
          throw new Error(text || `Server responded with ${res.status}`);
        }
        // success
        setStatus("success");
        setMessage("Thanks — you are subscribed!");
        // persist last email for convenience
        try { window.localStorage.setItem("seemati_last_email", String(email).trim()); } catch (e) {}
        return;
      } catch (err) {
        setStatus("error");
        setMessage("Subscription failed (server). We'll save locally and you can retry later.");
        // fall through to local save
      }
    }

    // Mode 2: Mailchimp embedded form (if configured)
    if (MAILCHIMP_FORM_ACTION && !NEWSLETTER_API_URL) {
      // create and submit a hidden form to Mailchimp action; opens new tab
      try {
        const form = document.createElement("form");
        form.action = MAILCHIMP_FORM_ACTION;
        form.method = "POST";
        form.target = "_blank"; // open mailchimp response in new tab (typical)
        form.style.display = "none";

        // Mailchimp uses `EMAIL` and `FNAME` / `NAME` fields in many embed forms.
        // We'll append both so common variants work. If your Mailchimp form uses
        // different field names, update this code or use NEWSLETTER_API_URL backend instead.
        const emailInput = document.createElement("input");
        emailInput.name = "EMAIL";
        emailInput.value = String(email).trim();
        form.appendChild(emailInput);

        const nameInput = document.createElement("input");
        nameInput.name = "FNAME";
        nameInput.value = String(name).trim();
        form.appendChild(nameInput);

        document.body.appendChild(form);
        form.submit();
        document.body.removeChild(form);

        setStatus("success");
        setMessage("Mailchimp form opened in new tab — complete sign-up there if required.");
        try { window.localStorage.setItem("seemati_last_email", String(email).trim()); } catch (e) {}
        return;
      } catch (err) {
        setStatus("error");
        setMessage("Mailchimp submission failed — saving locally instead.");
        // fall through to local save
      }
    }

    // Mode 3: local fallback — store in localStorage
    try {
      const item = {
        id: "n_" + Math.random().toString(36).slice(2, 9),
        name: name ? String(name).trim() : "",
        email: String(email).trim(),
        createdAt: Date.now(),
      };
      let store = [];
      try {
        const raw = window.localStorage.getItem(LOCAL_STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) store = parsed;
        }
      } catch (e) { /* ignore */ }
      store.unshift(item);
      window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(store));
      window.localStorage.setItem("seemati_last_email", String(email).trim());
      setStatus("success");
      setMessage("Saved locally — thanks! (You can export subscribers from localStorage later.)");
    } catch (err) {
      setStatus("error");
      setMessage("Unable to save (localStorage blocked). Please try again or contact support.");
    }
  }

  return (
    <section aria-labelledby="newsletter-title" className={`seemati-newsletter ${className}`} style={root}>
      <div style={inner}>
        <h3 id="newsletter-title" style={title}>Join the Seemati newsletter</h3>
        <p style={lead}>Get early access to new drops, exclusive discounts and style tips. No spam — unsubscribe anytime.</p>

        <form onSubmit={handleSubmit} style={formStyle} aria-describedby="newsletter-note">
          <div style={fieldRow}>
            <label style={srOnly}>
              Name
              <input
                type="text"
                name="name"
                placeholder="Your name (optional)"
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={inputStyle}
                aria-label="Your name (optional)"
              />
            </label>

            <label style={{ display: "block", flex: "1 1 300px" }}>
              <span style={srLabel}>Email</span>
              <input
                type="email"
                name="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={inputStyle}
                required
                aria-required="true"
                aria-label="Email address"
              />
            </label>

            <div style={{ display: "flex", alignItems: "center" }}>
              <button
                type="submit"
                disabled={status === "saving"}
                style={primaryBtn}
                aria-disabled={status === "saving"}
              >
                {status === "saving" ? "Saving…" : "Subscribe"}
              </button>
            </div>
          </div>

          <div id="newsletter-note" style={{ marginTop: 8 }}>
            <small style={{ color: "#666" }}>
              We never share your email. {NEWSLETTER_API_URL ? "Using secure server signup." : MAILCHIMP_FORM_ACTION ? "Opens Mailchimp in a new tab." : "Saved locally for now."}
            </small>
          </div>

          {message && (
            <div role="status" aria-live="polite" style={{ marginTop: 10 }}>
              <small style={{ color: status === "success" ? "#0a8f3a" : "#b00020" }}>{message}</small>
            </div>
          )}
        </form>
      </div>
    </section>
  );
}

/* ---------- Inline styles ---------- */
const root = {
  padding: "22px 12px",
  background: "#fafafa",
  color: "#111",
  borderRadius: 8,
  marginTop: 18,
};

const inner = {
  maxWidth: 1000,
  margin: "0 auto",
};

const title = {
  fontSize: 18,
  margin: 0,
};

const lead = {
  marginTop: 8,
  color: "#333",
  fontSize: 14,
};

const formStyle = {
  marginTop: 12,
};

const fieldRow = {
  display: "flex",
  gap: 8,
  alignItems: "flex-start",
  flexWrap: "wrap",
};

const inputStyle = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 8,
  border: "1px solid #e6e6e6",
  fontSize: 14,
  boxSizing: "border-box",
};

const srOnly = {
  position: "relative",
  display: "none",
};

const srLabel = {
  display: "none",
};

const primaryBtn = {
  padding: "10px 14px",
  background: "#0b6eff",
  color: "#fff",
  border: "none",
  borderRadius: 8,
  cursor: "pointer",
  fontSize: 14,
};

/* ---------- Exports (none) ---------- */
