// src/index.js
// ------------------ IMPORTS MUST BE AT THE TOP ------------------
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import App from "./App";
import "./index.css";
import "./utils/axiosConfig"; // safe file (should not read localStorage at module top)
// -----------------------------------------------------------------

// Install global handlers right after imports (safe + eslint-compliant)
function installGlobalHandlers() {
  try { console.log("[startup] global handlers installing"); } catch (e) {}

  window.addEventListener("error", function (evt) {
    try {
      console.error(
        "[window.error] message:",
        evt.message,
        "source:",
        evt.filename,
        "lineno:",
        evt.lineno,
        "col:",
        evt.colno,
        "error:",
        evt.error
      );
      showFatal("window.error: " + evt.message + " — see console");
    } catch (e) {}
  });

  window.addEventListener("unhandledrejection", function (evt) {
    try {
      console.error("[unhandledrejection] reason:", evt.reason);
      showFatal("unhandledrejection: " + String(evt.reason));
    } catch (e) {}
  });

  window.onerror = function (msg, url, lineNo, columnNo, error) {
    try {
      console.error(
        "[onerror] msg:",
        msg,
        "url:",
        url,
        "line:",
        lineNo,
        "col:",
        columnNo,
        "err:",
        error
      );
      showFatal("onerror: " + msg + " — see console");
    } catch (e) {}
  };

  function showFatal(text) {
    try {
      const id = "__fatal_overlay__";
      let el = document.getElementById(id);
      if (!el) {
        el = document.createElement("div");
        el.id = id;
        Object.assign(el.style, {
          position: "fixed",
          zIndex: 999999,
          left: 0,
          top: 0,
          right: 0,
          background: "rgba(255,255,255,0.98)",
          color: "#900",
          padding: "18px",
          fontFamily: "monospace",
          fontSize: "14px",
          borderBottom: "2px solid #900",
        });
        document.documentElement.appendChild(el);
      }
      el.textContent = text;
    } catch (e) {}
  }
}

installGlobalHandlers();

// small boot badge so you can visually confirm the bundle executed
(function showBootBadge() {
  try {
    const b = document.createElement("div");
    b.id = "__boot_banner__";
    b.textContent = "BOOT: index.js executed";
    Object.assign(b.style, {
      position: "fixed",
      right: 8,
      bottom: 8,
      zIndex: 999998,
      background: "#000",
      color: "#fff",
      padding: "6px 8px",
      fontSize: "12px",
      borderRadius: "4px",
      opacity: 0.85,
    });
    document.documentElement.appendChild(b);
  } catch (e) {}
})();

// Render the app inside a BrowserRouter & HelmetProvider so hooks like useNavigate and Helmet work everywhere
const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <HelmetProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </HelmetProvider>
  </React.StrictMode>
);
