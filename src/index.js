// src/index.js  — FULL REPLACEMENT (imports at top; browser-guarded debug)
import React from "react";
import { BrowserRouter } from "react-router-dom";
import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import App from "./App";
import "./index.css";
import "./utils/axiosConfig"; // safe file (should not read localStorage at module top)

/* ========== Browser-only debug instrumentation ========== */
if (typeof window !== "undefined" && typeof document !== "undefined") {
  (function browserDebug() {
    try {
      console.log(`[seemati:debug] index.js start — ${new Date().toISOString()}`);
      console.log(`[seemati:debug] initial location.pathname = ${location.pathname}`);
    } catch (e) {
      // ignore
    }

    function getStack() {
      try {
        const err = new Error();
        if (!err.stack) return null;
        return err.stack.split("\n").slice(2).join("\n");
      } catch (e) {
        return null;
      }
    }

    const debugObj = { original: {} };

    try {
      if (window.history && typeof window.history.pushState === "function") {
        debugObj.original.pushState = window.history.pushState;
        window.history.pushState = function (state, title, url) {
          try {
            console.log("[seemati:debug] history.pushState called", { state, title, url });
            console.log("[seemati:debug] pushState stack:\n", getStack());
          } catch (e) {}
          return debugObj.original.pushState.apply(window.history, arguments);
        };
      }
    } catch (e) {
      console.warn("[seemati:debug] history.pushState instrumentation failed", e);
    }

    try {
      if (window.history && typeof window.history.replaceState === "function") {
        debugObj.original.replaceState = window.history.replaceState;
        window.history.replaceState = function (state, title, url) {
          try {
            console.log("[seemati:debug] history.replaceState called", { state, title, url });
            console.log("[seemati:debug] replaceState stack:\n", getStack());
          } catch (e) {}
          return debugObj.original.replaceState.apply(window.history, arguments);
        };
      }
    } catch (e) {
      console.warn("[seemati:debug] history.replaceState instrumentation failed", e);
    }

    try {
      if (window.location) {
        if (typeof window.location.assign === "function") {
          debugObj.original.assign = window.location.assign;
          Object.defineProperty(window.location, "assign", {
            configurable: true,
            enumerable: true,
            writable: true,
            value: function (url) {
              try {
                console.log("[seemati:debug] location.assign called ->", url);
                console.log("[seemati:debug] location.assign stack:\n", getStack());
              } catch (e) {}
              return debugObj.original.assign.call(window.location, url);
            },
          });
        }

        if (typeof window.location.replace === "function") {
          debugObj.original.replace = window.location.replace;
          Object.defineProperty(window.location, "replace", {
            configurable: true,
            enumerable: true,
            writable: true,
            value: function (url) {
              try {
                console.log("[seemati:debug] location.replace called ->", url);
                console.log("[seemati:debug] location.replace stack:\n", getStack());
              } catch (e) {}
              return debugObj.original.replace.call(window.location, url);
            },
          });
        }

        try {
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
                } catch (e) {}
                return originalHrefSetter(url);
              },
            });
          }
        } catch (e) {
          // some browsers/environments may disallow; ignore
        }
      }
    } catch (e) {
      console.warn("[seemati:debug] location instrumentation failed", e);
    }

    try {
      window.addEventListener("popstate", function (ev) {
        try {
          console.log("[seemati:debug] popstate event", ev, "current pathname:", location.pathname);
        } catch (e) {}
      });
    } catch (e) {}

    try {
      window.addEventListener("error", (ev) => {
        try {
          console.error("[seemati:debug] window.error:", ev.message || ev);
          console.error("[seemati:debug] source:", ev.filename, "line:", ev.lineno, "col:", ev.colno);
          if (ev.error && ev.error.stack) console.error("[seemati:debug] stack:\n", ev.error.stack);
        } catch (e) {}
      });

      window.addEventListener("unhandledrejection", (ev) => {
        try {
          console.error("[seemati:debug] unhandledrejection:", ev.reason);
          if (ev.reason && ev.reason.stack) console.error("[seemati:debug] rejection stack:\n", ev.reason.stack);
        } catch (e) {}
      });
    } catch (e) {}

    // Expose helper to console for quick inspection
    try {
      window.__SEEMATI_DEBUG__ = window.__SEEMATI_DEBUG__ || {};
      window.__SEEMATI_DEBUG__.nav = debugObj;
    } catch (e) {}

    // Visual confirmation badge
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
}

/* ========== Mount React app (safe, imports already at top) ========== */
try {
  const container = document.getElementById("root");
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
