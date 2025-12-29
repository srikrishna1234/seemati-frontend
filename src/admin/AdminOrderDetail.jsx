import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import axiosInstance from "../api/axiosInstance";

const STATUS_OPTIONS = [
  { value: "Placed", label: "Placed" },
  { value: "Packed", label: "Packed" },
  { value: "Shipped", label: "Dispatched" },
  { value: "Delivered", label: "Delivered" }
];

export default function AdminOrderDetail() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
const [status, setStatus] = useState("");
const [saving, setSaving] = useState(false);
const [loading, setLoading] = useState(true);
const [error, setError] = useState("");


  useEffect(() => {
    async function loadOrder() {
      try {
        const res = await axiosInstance.get(`/admin/orders/${id}`);
        setOrder(res.data.order);
		setStatus(res.data.order.status);

      } catch (err) {
        console.error("Failed to load order", err);
        setError("Failed to load order");
      } finally {
        setLoading(false);
      }
    }
    loadOrder();
  }, [id]);

  if (loading) return <div style={{ padding: 20 }}>Loading…</div>;
  if (error) return <div style={{ padding: 20, color: "red" }}>{error}</div>;
  if (!order) return null;

  const c = order.customer || {};
  const t = order.totals || {};

  return (
    <div style={{ padding: 24 }}>
      <h2>Order Details</h2>

      <p><strong>Order ID:</strong> {order._id}</p>
      <p><strong>Date:</strong> {new Date(order.createdAt).toLocaleString()}</p>
      <p><strong>Payment:</strong> {order.paymentMethod}</p>
      <p>
  <strong>Status:</strong>{" "}
  <select
    value={status}
    onChange={(e) => setStatus(e.target.value)}
    style={{ marginLeft: 8, padding: 4 }}
  >
    {STATUS_OPTIONS.map((s) => (
      <option key={s.value} value={s.value}>
        {s.label}
      </option>
    ))}
  </select>

  <button
    onClick={async () => {
      try {
        setSaving(true);
        await axiosInstance.put(
          `/admin/orders/${order._id}/status`,
          { status }
        );
        alert("Order status updated");
        setOrder({ ...order, status });
      } catch {
        alert("Failed to update status");
      } finally {
        setSaving(false);
      }
    }}
    disabled={saving}
    style={{ marginLeft: 12 }}
  >
    {saving ? "Saving…" : "Save"}
  </button>
</p>

      <hr />

      <h3>Customer</h3>
      <p><strong>Phone:</strong> {c.phone || "-"}</p>
      <p>
  <strong>Address:</strong><br />
  {c.name && <>{c.name}<br /></>}
  {c.address ? (
    <span style={{ whiteSpace: "pre-line" }}>
      {c.address}
    </span>
  ) : (
    "-"
  )}
</p>



      <hr />

      <h3>Items</h3>
      <ul style={{ lineHeight: "1.8" }}>
  {(order.items || []).map((item, idx) => (
    <li key={idx}>
  <strong>{item.title || "-"}</strong><br />
  {item.sku && <>SKU: {item.sku}<br /></>}
  {item.color && <>Color: {item.color} &nbsp;|&nbsp; </>}
  {item.size && <>Size: {item.size}<br /></>}
  Qty: {item.quantity} × ₹{item.price}
</li>

  ))}
</ul>


      <hr />

      <h3>Totals</h3>
      <p>Subtotal: ₹{t.subtotal}</p>
      <p>Shipping: ₹{t.shipping}</p>
      <p>Tax: ₹{t.tax}</p>
      <p><strong>Total: ₹{t.total}</strong></p>

      <br />

      <Link to="/admin/orders">← Back to Orders</Link>
    </div>
  );
}
