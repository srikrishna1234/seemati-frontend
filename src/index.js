// src/index.js  — FULL REPLACEMENT (debug instrumented)
// Drop this file in place of your existing src/index.js and deploy.

(function seedDebug() {
  try {
    /* Earliest possible log */
    const now = new Date().toISOString();
    console.log(`[seemati:debug] index.js start — ${now}`);
    console.log(`[seemati:debug] initial location.pathname = ${location.pathname}`);
  } catch (e) {
    /* fail silently if console not available */
  }
})();

/* ========== Instrument navigation APIs ========== */
(function instrumentNavigation() {
  function getStack() {
    // Skip first two lines to remove this helper and instrument wrapper noise
    const err = new Error();
    if (!err.stack) return null;
    const stack = err.stack.split('\n').slice(2).join('\n');
    return stack;
  }

  const debugObj = {
    original: {}
  };

  // history.pushState
  try {
    debugObj.original.pushState = window.history.pushState;
    window.history.pushState = function (state, title, url) {
      try {
        console.log('[seemati:debug] history.pushState called', { state, title, url });
        console.log('[seemati:debug] pushState stack:\n', getStack());
      } catch (e) {
        console.error('[seemati:debug] pushState logging failed', e);
      }
      return debugObj.original.pushState.apply(window.history, arguments);
    };

    debugObj.original.replaceState = window.history.replaceState;
    window.history.replaceState = function (state, title, url) {
      try {
        console.log('[seemati:debug] history.replaceState called', { state, title, url });
        console.log('[seemati:debug] replaceState stack:\n', getStack());
      } catch (e) {
        console.error('[seemati:debug] replaceState logging failed', e);
      }
      return debugObj.original.replaceState.apply(window.history, arguments);
    };
  } catch (e) {
    console.warn('[seemati:debug] history instrumentation failed', e);
  }

  // location.assign / replace and href setter
  try {
    debugObj.original.assign = window.location.assign;
    debugObj.original.replace = window.location.replace;
    Object.defineProperty(window.location, 'assign', {
      configurable: true,
      enumerable: true,
      writable: true,
      value: function (url) {
        try {
          console.log('[seemati:debug] location.assign called ->', url);
          console.log('[seemati:debug] location.assign stack:\n', getStack());
        } catch (e) {
          console.error('[seemati:debug] location.assign logging failed', e);
        }
        return debugObj.original.assign.call(window.location, url);
      }
    });
    Object.defineProperty(window.location, 'replace', {
      configurable: true,
      enumerable: true,
      writable: true,
      value: function (url) {
        try {
          console.log('[seemati:debug] location.replace called ->', url);
          console.log('[seemati:debug] location.replace stack:\n', getStack());
        } catch (e) {
          console.error('[seemati:debug] location.replace logging failed', e);
        }
        return debugObj.original.replace.call(window.location, url);
      }
    });

    // Intercept setting window.location.href = '...'
    const locProto = Object.getPrototypeOf(window.location);
    const hrefDesc = Object.getOwnPropertyDescriptor(locProto, 'href');
    if (hrefDesc && hrefDesc.set) {
      const originalHrefSetter = hrefDesc.set.bind(window.location);
      Object.defineProperty(window.location, 'href', {
        configurable: true,
        enumerable: true,
        set: function (url) {
          try {
            console.log('[seemati:debug] location.href setter called ->', url);
            console.log('[seemati:debug] location.href stack:\n', getStack());
          } catch (e) {
            console.error('[seemati:debug] location.href logging failed', e);
          }
          return originalHrefSetter(url);
        }
      });
    }
  } catch (e) {
    console.warn('[seemati:debug] location instrumentation failed', e);
  }

  // popstate listener
  try {
    window.addEventListener('popstate', function (ev) {
      try {
        console.log('[seemati:debug] popstate event', ev, 'current pathname:', location.pathname);
      } catch (e) {
        console.error('[seemati:debug] popstate logging failed', e);
      }
    });
  } catch (e) {
    console.warn('[seemati:debug] popstate listener failed', e);
  }

  // Expose debug helpers
  window.__SEEMATI_DEBUG__ = window.__SEEMATI_DEBUG__ || {};
  window.__SEEMATI_DEBUG__.nav = debugObj;
})();

/* ========== Global error / promise handlers ========== */
(function installGlobalHandlers() {
  try {
    window.addEventListener('error', (ev) => {
      try {
        console.error('[seemati:debug] window.error:', ev.message || ev);
        console.error('[seemati:debug] source:', ev.filename, 'line:', ev.lineno, 'col:', ev.colno);
        if (ev.error && ev.error.stack) console.error('[seemati:debug] stack:\n', ev.error.stack);
      } catch (e) {
        console.error('[seemati:debug] error handler crashed', e);
      }
    });

    window.addEventListener('unhandledrejection', (ev) => {
      try {
        console.error('[seemati:debug] unhandledrejection:', ev.reason);
        if (ev.reason && ev.reason.stack) console.error('[seemati:debug] rejection stack:\n', ev.reason.stack);
      } catch (e) {
        console.error('[seemati:debug] unhandledrejection handler crashed', e);
      }
    });

    // Also log console.warn/info to get more visibility (non-invasive)
    (function wrapConsoleWarn() {
      const origWarn = console.warn.bind(console);
      console.warn = function () {
        try {
          origWarn.apply(console, arguments);
          // Also write a prefixed message for filtering
          origWarn('[seemati:debug][warn-captured]', ...arguments);
        } catch (e) {
          // ignore
        }
      };
    })();
  } catch (e) {
    // ignore
  }
})();

/* ========== Normal React app bootstrap (render) ========== */
import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { createRoot } from 'react-dom/client';
import App from './App';

(function renderApp() {
  console.log('[seemati:debug] renderApp() start — about to mount React');
  try {
    const container = document.getElementById('root') || document.getElementById('app') || document.body;
    if (!container) {
      console.error('[seemati:debug] No root container found in DOM.');
    }

    // Typical React 18 createRoot
    try {
      const root = createRoot(container);
      root.render(
        <React.StrictMode>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </React.StrictMode>
      );
      console.log('[seemati:debug] React render finished — app mounted');
    } catch (errRender) {
      console.error('[seemati:debug] React createRoot/render threw:', errRender);
      // Try legacy render fallback
      try {
        // eslint-disable-next-line no-undef
        const legacyReactDOM = require('react-dom');
        legacyReactDOM.render(
          <React.StrictMode>
            <BrowserRouter>
              <App />
            </BrowserRouter>
          </React.StrictMode>,
          container
        );
        console.log('[seemati:debug] Legacy ReactDOM.render fallback succeeded');
      } catch (legacyErr) {
        console.error('[seemati:debug] Legacy render fallback failed:', legacyErr);
      }
    }
  } catch (e) {
    console.error('[seemati:debug] renderApp() caught:', e);
  }
})();
