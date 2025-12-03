// src/index.js  — FULL REPLACEMENT (imports first, then debug instrumentation)
import React from "react";
import { BrowserRouter } from "react-router-dom";
import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import App from "./App";
import "./index.css";
import "./utils/axiosConfig"; // safe file (should not read localStorage at module top)

/* ========== Earliest visual / console marker ========== */
try {
  console.log(`[seemati:debug] index.js start — ${new Date().toISOString()}`);
  console.log(`[seemati:debug] initial location.pathname = ${location.pathname}`);
} catch (e) {}

/* ========== Instrument navigation APIs ========== */
(function instrumentNavigation() {
  function getStack() {
    const err = new Error();
    if (!err.stack) return null;
    // skip 2 stack frames to reduce wrapper noise
    return err.stack.split("\n").slice(2).join("\n");
  }

  const debugObj = { original: {} };

  try {
    debugObj.original.pushState = window.history.pushState;
    window.history.pushState = function (state, title, url) {
      try {
        console.log("[seemati:debug] history.pushState called", { state, title, url });
        console.log("[seemati:debug] pushState stack:\n", getStack());
      } catch (e) {
        console.error("[seemati:debug] pushState logging failed", e);
      }
      return debugObj.original.pushState.apply(window.history, arguments);
    };

    debugObj.original.replaceState = window.history.replaceState;
    window.history.replaceState = function (state, title, url) {
      try {
        console.log("[seemati:debug] history.replaceState called", { state, title, url });
        console.log("[seemati:debug] replaceState stack:\n", getStack());
      } catch (e) {
        console.error("[seemati:debug] replaceState logging failed", e);
      }
      return debugObj.original.replaceState.apply(window.history, arguments);
    };
  } catch (e) {
    console.warn("[seemati:debug] history instrumentation failed", e);
  }

  try {
    debugObj.original.assign = window.location.assign;
    debugObj.original.replace = window.location.replace;

    Object.defineProperty(window.location, "assign", {
      configurable: true,
      enumerable: true,
      writable: true,
      value: function (url) {
        try {
          console.log("[seemati:debug] location.assign called ->", url);
          console.log("[seemati:debug] location.assign stack:\n", getStack());
        } catch (e) {
          console.error("[seemati:debug] location.assign logging failed", e);
        }
        return debugObj.original.assign.call(window.location, url);
      },
    });

    Object.defineProperty(window.location, "replace", {
      configurable: true,
      enumerable: true,
      writable: true,
      value: function (url) {
        try {
          console.log("[seemati:debug] location.replace called ->", url);
          console.log("[seemati:debug] location.replace stack:\n", getStack());
        } catch (e) {
          console.error("[seemati:debug] location.replace logging failed", e);
        }
        return debugObj.original.replace.call(window.location, url);
      },
    });

    const locProto = Object.getPrototypeOf(window.location);
    const hrefDesc = Object.getOwnPropertyDescriptor(locProto, "href");
    if (hrefDesc && hrefDesc.set) {
      const originalHrefSetter = hrefDesc.set.bind(window.location);
      Object.defineProperty(window.location, "href", {
        configurable: true,
        enumerable: true,
        set: function (url) {
          try {
            console.log("[seemati:debug] location.href setter called ->", url);
            console.log("[seemati:debug] location.href stack:\n", getStack());
          } catch (e) {
            console.error("[seemati:debug] location.href logging failed", e);
          }
          return originalHrefSetter(url);
        },
      });
    }
  } catch (e) {
    console.warn("[seemati:debug] location instrumentation failed", e);
  }

  try {
    window.addEventListener("popstate", function (ev) {
      try {
        console.log("[seemati:debug] popstate event", ev, "current pathname:", location.pathname);
      } catch (e) {
        console.error("[seemati:debug] popstate logging failed", e);
      }
    });
  } catch (e) {
    console.warn("[seemati:debug] popstate listener failed", e);
  }

  // Expose debug helpers to console
  window.__SEEMATI_DEBUG__ = window.__SEEMATI_DEBUG__ || {};
  window.__SEEMATI_DEBUG__.nav = debugObj;
})();

/* ========== Global error / promise handlers ========== */
(function installGlobalHandlers() {
  try {
    console.log("[seemati:debug] installing global error handlers");
  } catch (e) {}

  try {
    window.addEventListener("error", (ev) => {
      try {
        console.error("[seemati:debug] window.error:", ev.message || ev);
        console.error("[seemati:debug] source:", ev.filename, "line:", ev.lineno, "col:", ev.colno);
        if (ev.error && ev.error.stack) console.error("[seemati:debug] stack:\n", ev.error.stack);
      } catch (e) {
        console.error("[seemati:debug] error handler crashed", e);
      }
    });

    window.addEventListener("unhandledrejection", (ev) => {
      try {
        console.error("[seemati:debug] unhandledrejection:", ev.reason);
        if (ev.reason && ev.reason.stack) console.error("[seemati:debug] rejection stack:\n", ev.reason.stack);
      } catch (e) {
        console.error("[seemati:debug] unhandledrejection handler crashed", e);
      }
    });
  } catch (e) {
    console.warn("[seemati:debug] failed to attach global handlers", e);
  }
})();

/* ========== Small boot badge so you can visually confirm the bundle executed ========== */
(function showBootBadge() {
  try {
    const id = "__boot_banner__";
    if (!document.getElementById(id)) {
      const b = document.createElement("div");
      b.id = id;
      b.textContent = "DEBUG BOOT: index.js executed";
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
    }
  } catch (e) {}
})();

/* ========== Mount React app (safe, after instrumentation) ========== */
try {
  console.log("[seemati:debug] renderApp() start — about to mount React");
  const container = document.getElementById("root") || document.getElementById("app");
  if (!container) {
    console.error("[seemati:debug] No root container found in DOM.");
  }
  const root = createRoot(container);
  root.render(
    <React.StrictMode>
      <HelmetProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </HelmetProvider>
    </React.StrictMode>
  );
  console.log("[seemati:debug] React render finished — app mounted");
} catch (errRender) {
  console.error("[seemati:debug] React createRoot/render threw:", errRender);
  try {
    // Fallback to legacy render if available
    // eslint-disable-next-line global-require
    const legacyReactDOM = require("react-dom");
    legacyReactDOM.render(
      <React.StrictMode>
        <HelmetProvider>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </HelmetProvider>
      </React.StrictMode>,
      document.getElementById("root")
    );
    console.log("[seemati:debug] Legacy ReactDOM.render fallback succeeded");
  } catch (legacyErr) {
    console.error("[seemati:debug] Legacy render fallback failed:", legacyErr);
  }
}
