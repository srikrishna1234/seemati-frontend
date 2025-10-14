// src/components/OtpCheckout.jsx
import React, { useState, useEffect, useRef } from "react";

// Use relative API paths (CRA proxy forwards to backend in dev)
const API = "";

// Small in-file logger: silenced in production
const isDev = process.env.NODE_ENV === "development";
const log = (...args) => { if (isDev) console.log(...args); };
const warn = (...args) => { if (isDev) console.warn(...args); };
const errorLog = (...args) => { if (isDev) console.error(...args); };

function OtpModal({ open, onClose, prefillPhone, onVerified }) {
  const [step, setStep] = useState(1);
  const [phone, setPhone] = useState(prefillPhone || "");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState(null);
  const [resendCooldown, setResendCooldown] = useState(0);
  const otpInputRef = useRef(null);
  const cooldownRef = useRef(null);

  useEffect(() => {
    setPhone(prefillPhone || "");
    setStep(1);
    setCode("");
    setMessage("");
    setError(null);
    setResendCooldown(0);
    if (cooldownRef.current) {
      clearInterval(cooldownRef.current);
      cooldownRef.current = null;
    }
  }, [open, prefillPhone]);

  useEffect(() => {
    // autofocus OTP input when step becomes 2
    if (step === 2 && otpInputRef.current) {
      otpInputRef.current.focus();
    }
  }, [step]);

  useEffect(() => {
    // manage countdown
    if (resendCooldown <= 0) return;
    cooldownRef.current = setInterval(() => {
      setResendCooldown((s) => {
        if (s <= 1) {
          clearInterval(cooldownRef.current);
          cooldownRef.current = null;
          return 0;
        }
        return s - 1;
      });
    }, 1000);

    return () => {
      if (cooldownRef.current) clearInterval(cooldownRef.current);
    };
  }, [resendCooldown]);

  async function sendOtp() {
    setError(null);
    setMessage("");
    if (!phone) return setError("Please enter phone");
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/auth/send-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
        credentials: "include",
      });

      // special handling for rate-limit
      if (res.status === 429) {
        let data = null;
        try { data = await res.json(); } catch (e) { warn('send-otp: failed to parse json on 429', e); }
        const msg = (data && data.message) || "Too many OTP requests — please try again later.";
        // set a 15-minute UI cooldown (matches server window)
        setResendCooldown(15 * 60);
        setError(msg);
        return;
      }

      if (!res.ok) {
        let data = null;
        try { data = await res.json(); } catch (e) { warn('send-otp: failed to parse json', e); }
        throw new Error((data && data.message) || `Server returned ${res.status}`);
      }
      const data = await res.json();
      if (!data || !data.ok) throw new Error(data?.message || "Failed to send OTP");
      setStep(2);
      setMessage("OTP sent — please check your phone.");
      // start a 60s resend cooldown (normal)
      setResendCooldown(60);
      log('OTP sent to', phone);
    } catch (e) {
      setError(e.message || String(e));
      errorLog('sendOtp error', e);
    } finally {
      setLoading(false);
    }
  }

  async function resendOtp() {
    if (resendCooldown > 0) return;
    await sendOtp();
  }

  async function verifyOtp() {
    setError(null);
    setMessage("");
    if (!code) return setError("Enter the OTP");
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/auth/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, code }),
        credentials: "include",
      });

      // If server sends 429 here (unlikely), handle gracefully
      if (res.status === 429) {
        let data = null;
        try { data = await res.json(); } catch (e) { warn('verify-otp: failed to parse json on 429', e); }
        const msg = (data && data.message) || "Too many requests — please try again later.";
        setResendCooldown(15 * 60);
        setError(msg);
        return;
      }

      if (!res.ok) {
        let data = null;
        try { data = await res.json(); } catch (e) { warn('verify-otp: failed to parse json', e); }
        throw new Error((data && data.message) || `Server returned ${res.status}`);
      }
      const data = await res.json();
      if (!data || !data.ok) throw new Error(data?.message || "OTP verify failed");
      setMessage("Verified — continuing checkout...");
      onVerified && onVerified(data.user);
      onClose && onClose();
      log('OTP verified for', phone);
    } catch (e) {
      setError(e.message || String(e));
      errorLog('verifyOtp error', e);
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
        <h3 className="text-lg font-semibold mb-3">Login / Verify by OTP</h3>
        <div className="space-y-3">
          <div>
            <label className="block text-sm text-gray-600">Phone number</label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full border p-2 rounded mt-1"
              placeholder="+919999999999"
              inputMode="tel"
            />
          </div>

          {step === 2 && (
            <div>
              <label className="block text-sm text-gray-600">Enter OTP</label>
              <input
                ref={otpInputRef}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full border p-2 rounded mt-1"
                placeholder="123456"
                inputMode="numeric"
              />
            </div>
          )}

          {message && <div className="text-sm text-green-600">{message}</div>}
          {error && <div className="text-sm text-red-600">{error}</div>}

          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              {step === 2 && (
                <>
                  Didn't get it?{' '}
                  <button
                    onClick={resendOtp}
                    disabled={resendCooldown > 0 || loading}
                    className={`underline ml-1 ${resendCooldown > 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend'}
                  </button>
                </>
              )}
            </div>

            <div className="flex gap-2">
              <button onClick={onClose} className="px-3 py-2 border rounded">Cancel</button>
              {step === 1 ? (
                <button onClick={sendOtp} disabled={loading} className="px-3 py-2 bg-blue-600 text-white rounded">
                  {loading ? "Sending..." : "Send OTP"}
                </button>
              ) : (
                <button onClick={verifyOtp} disabled={loading} className="px-3 py-2 bg-green-600 text-white rounded">
                  {loading ? "Verifying..." : "Verify OTP"}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function OrderSuccess({ orderId }) {
  const [order, setOrder] = useState(null);
  const [error, setError] = useState(null);
  useEffect(() => {
    if (!orderId) return;
    (async () => {
      try {
        const res = await fetch(`${API}/api/orders/${orderId}`, { credentials: "include" });
        if (!res.ok) {
          let d = null;
          try { d = await res.json(); } catch (e) { warn('order fetch parse error', e); }
          throw new Error((d && d.message) || `Server ${res.status}`);
        }
        const d = await res.json();
        setOrder(d.order);
      } catch (e) {
        setError(e.message || String(e));
        errorLog('Order fetch error', e);
      }
    })();
  }, [orderId]);

  if (error) return <div className="p-6 bg-white rounded">Error: {error}</div>;
  if (!order) return <div className="p-6 bg-white rounded">Loading order…</div>;

  return (
    <div className="p-6 bg-white rounded shadow">
      <h2 className="text-2xl font-bold mb-2">Order placed</h2>
      <div className="mb-4">Order ID: <strong>{order._id}</strong></div>
      <div className="mb-2">Status: <strong>{order.status}</strong></div>
      <div className="mb-2">Total: <strong>₹{order.totals && order.totals.total}</strong></div>
      <h3 className="mt-4 font-semibold">Items</h3>
      <ul className="mt-2 space-y-2">
        {order.items.map((it) => (
          <li key={it._id} className="flex justify-between">
            <div>{it.title} x {it.quantity}</div>
            <div>₹{it.price * it.quantity}</div>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* CheckoutWithOtp - returns orderId via onOrderPlaced (parent should handle navigation & clearing cart) */
export function CheckoutWithOtp({ initialCart = [], onOrderPlaced }) {
  const [cart, setCart] = useState(initialCart);
  const [customer, setCustomer] = useState({ name: "", phone: "", address: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [otpOpen, setOtpOpen] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API}/api/auth/me`, { credentials: "include" });
        if (!res.ok) return;
        const d = await res.json();
        if (d?.ok) setUser(d.user);
      } catch (e) { /* ignore */ }
    })();
  }, []);

  async function placeOrder() {
    setError(null);
    setLoading(true);

    if (!cart || cart.length === 0) {
      setError("Cart is empty");
      setLoading(false);
      return;
    }

    if (!user) {
      setOtpOpen(true);
      setLoading(false);
      return;
    }

    try {
      const payload = { customer, items: cart, paymentMethod: "cod" };
      const res = await fetch(`${API}/api/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        credentials: "include",
      });

      if (!res.ok) {
        let d = null;
        try { d = await res.json(); } catch (e) { warn('placeOrder parse error', e); }
        throw new Error((d && d.message) || `Server ${res.status}`);
      }

      const data = await res.json();
      if (!data || !data.ok) throw new Error(data?.message || "Order failed");

      // inform parent — parent should clear cart and navigate
      onOrderPlaced && onOrderPlaced(data.orderId, data.order);
      log('Order placed', data.orderId);
      // DO NOT call window.location.href here — parent handles navigation
    } catch (e) {
      setError(e.message || String(e));
      errorLog('placeOrder error', e);
    } finally {
      setLoading(false);
    }
  }

  function onOtpVerified(userInfo) {
    setUser(userInfo);
    // resume placing order after verification
    setTimeout(() => { placeOrder(); }, 200);
  }

  return (
    <div className="space-y-4">
      <div className="bg-white p-4 rounded shadow">
        <h2 className="text-xl font-semibold">Checkout</h2>
        <div className="mt-3 grid grid-cols-1 gap-3">
          <input value={customer.name} onChange={(e) => setCustomer({ ...customer, name: e.target.value })} placeholder="Full name" className="w-full border p-2 rounded" />
          <input value={customer.phone} onChange={(e) => setCustomer({ ...customer, phone: e.target.value })} placeholder="Phone (+91...)" className="w-full border p-2 rounded" />
          <textarea value={customer.address} onChange={(e) => setCustomer({ ...customer, address: e.target.value })} placeholder="Address" className="w-full border p-2 rounded" />
        </div>

        <div className="mt-4">
          <h3 className="font-medium">Order summary</h3>
          <ul className="mt-2 space-y-2">
            {cart.map((it, idx) => (
              <li key={idx} className="flex justify-between">
                <div>{it.title} x {it.quantity}</div>
                <div>₹{it.price * it.quantity}</div>
              </li>
            ))}
          </ul>
        </div>

        {error && <div className="text-red-600 mt-3">{error}</div>}

        <div className="mt-4 flex gap-2">
          <button onClick={placeOrder} disabled={loading} className="px-4 py-2 bg-indigo-600 text-white rounded">{loading ? "Placing..." : "Place order"}</button>
          <button onClick={() => setOtpOpen(true)} className="px-4 py-2 border rounded">Login / Verify</button>
        </div>
      </div>

      <OtpModal open={otpOpen} onClose={() => setOtpOpen(false)} prefillPhone={customer.phone} onVerified={onOtpVerified} />
    </div>
  );
}

export default CheckoutWithOtp;
