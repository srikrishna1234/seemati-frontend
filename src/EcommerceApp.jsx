// frontend/src/EcommerceApp.jsx
import React, { useMemo, useState } from "react";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import About from "./About";
import Contact from "./Contact";
// make sure this file exists at src/admin/AdminPage.jsx and exports default
import AdminPage from "./admin/AdminPage";

function currency(n) {
  return "₹" + n.toFixed(2);
}

const initialProducts = [
  { id: 1, name: "Leggings", price: 299, image: "/images/leggings.jpg" },
  { id: 2, name: "Kurti Pants", price: 399, image: "/images/kurti-pants.jpg" },
  { id: 3, name: "Palazzos", price: 449, image: "/images/palazzos.jpg" },
  { id: 4, name: "Cigar Pants", price: 499, image: "/images/cigar-pants.jpg" },
  { id: 5, name: "Straight Pants", price: 549, image: "/images/straight-pants.jpg" },
];

function Shop() {
  const [cart, setCart] = useState([]);
  const [showCart, setShowCart] = useState(false);

  function addToCart(p) {
    setCart((prev) => {
      const existing = prev.find((x) => x.id === p.id);
      if (existing) {
        return prev.map((x) => (x.id === p.id ? { ...x, qty: x.qty + 1 } : x));
      }
      return [...prev, { ...p, qty: 1 }];
    });
  }

  function removeOne(id) {
    setCart((prev) => {
      const found = prev.find((x) => x.id === id);
      if (!found) return prev;
      if (found.qty <= 1) return prev.filter((x) => x.id !== id);
      return prev.map((x) => (x.id === id ? { ...x, qty: x.qty - 1 } : x));
    });
  }

  function removeLine(id) {
    setCart((prev) => prev.filter((x) => x.id !== id));
  }

  const total = useMemo(() => cart.reduce((s, x) => s + x.price * x.qty, 0), [cart]);

  function handlePayment() {
    if (cart.length === 0) {
      alert("Your cart is empty.");
      return;
    }
    if (!(window && window.Razorpay)) {
      alert("Razorpay SDK not loaded yet. Please wait a moment and try again.");
      return;
    }
    const options = {
      key: "rzp_test_1234567890abcdef", // replace with real key when ready
      amount: Math.round(total * 100),
      currency: "INR",
      name: "Seemati Ladies Wear",
      description: "Order Payment (Test Mode)",
      handler: function (response) {
        alert("Payment Successful!\nPayment ID: " + response.razorpay_payment_id);
        setCart([]);
        setShowCart(false);
      },
      prefill: { name: "Test User", email: "test@example.com", contact: "9999999999" },
      notes: { brand: "Seemati Ladies Wear", mode: "test" },
      theme: { color: "#e91e63" },
    };
    const rzp = new window.Razorpay(options);
    rzp.open();
  }

  return (
    <div style={{ padding: "20px" }}>
      <h2>Welcome to Seemati Ladies Wear</h2>
      <div style={{ display: "flex", gap: "20px", flexWrap: "wrap" }}>
        {initialProducts.map((p) => (
          <div
            key={p.id}
            style={{
              border: "1px solid #ddd",
              padding: "10px",
              borderRadius: "8px",
              width: "180px",
              textAlign: "center",
            }}
          >
            <img src={p.image} alt={p.name} style={{ width: "100%" }} />
            <h4>{p.name}</h4>
            <p>{currency(p.price)}</p>
            <button onClick={() => addToCart(p)}>Add to Cart</button>
          </div>
        ))}
      </div>

      <hr />

      <button onClick={() => setShowCart(!showCart)}>
        {showCart ? "Hide Cart" : "Show Cart"} ({cart.length})
      </button>

      {showCart && (
        <div style={{ marginTop: "20px" }}>
          <h3>Your Cart</h3>
          {cart.length === 0 ? (
            <p>Cart is empty.</p>
          ) : (
            <div>
              {cart.map((item) => (
                <div
                  key={item.id}
                  style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: 8 }}
                >
                  <span>
                    {item.name} - {currency(item.price)} × {item.qty}
                  </span>
                  <button onClick={() => removeOne(item.id)}>-</button>
                  <button onClick={() => addToCart(item)}>+</button>
                  <button onClick={() => removeLine(item.id)}>Remove</button>
                </div>
              ))}
              <h4>Total: {currency(total)}</h4>
              <button onClick={handlePayment}>Checkout with Razorpay</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function EcommerceApp() {
  return (
    <Router>
      <nav style={{ marginBottom: "20px" }}>
        <Link to="/" style={{ marginRight: "15px" }}>
          Home
        </Link>
        <Link to="/about" style={{ marginRight: "15px" }}>
          About
        </Link>
        <Link to="/contact" style={{ marginRight: "15px" }}>
          Contact
        </Link>
        <Link to="/admin">Admin Panel</Link>
      </nav>

      <Routes>
        <Route path="/" element={<Shop />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/about" element={<About />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/test" element={<div style={{ padding: 20 }}>Hello Test Page</div>} />
      </Routes>
    </Router>
  );
}
