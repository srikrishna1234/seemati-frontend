// src/admin/AdminOrders.jsx
import React, { useEffect, useState } from "react";
import axiosInstance from "../api/axiosInstance";
import { Link } from "react-router-dom";

const STATUS_LABELS = {
  Placed: "Placed",
  Packed: "Packed",
  Shipped: "Shipped",
  Delivered: "Delivered"
};


export default function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);
const [localStatus, setLocalStatus] = useState("");

  useEffect(() => {
    let mounted = true;

    async function loadOrders() {
      try {
        const res = await axiosInstance.get("/admin/orders");
        if (!mounted) return;

        const list = res.data.orders || [];
        setOrders(list);
      } catch (err) {
        console.error("Failed to load orders", err);
        setError("Failed to load orders");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadOrders();
    return () => {
      mounted = false;
    };
  }, []);

  if (loading) return <div style={{ padding: 20 }}>Loading orders…</div>;
  if (error) return <div style={{ padding: 20, color: "red" }}>{error}</div>;

  return (
    <div style={{ padding: 24 }}>
      <h2>Orders</h2>

      {orders.length === 0 ? (
        <p>No orders found.</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              marginTop: 12
            }}
          >
            <thead>
  <tr>
    <th style={th}>Order ID</th>
    <th style={th}>Date</th>
    <th style={th}>Customer</th>
    <th style={th}>Total</th>
    <th style={th}>Payment</th>
    <th style={th}>Status</th>
  </tr>
</thead>

            <tbody>
              {orders.map((o) => (
                <tr
  key={o._id}
  onClick={() => {
  setSelectedOrder(o);
  setLocalStatus(o.status);
}}
  style={{ cursor: "pointer" }}
>
                  <td style={td}>
  <Link
    to={`/admin/orders/${o._id}`}
    state={{ from: `/admin/orders/${o._id}` }}
    style={{ color: "#0070f3", textDecoration: "underline" }}
  >
    {o._id.slice(-6)}
  </Link>
</td>

                  <td style={td}>
                    {new Date(o.createdAt).toLocaleDateString()}
                  </td>
                  <td style={td}>{o.customer?.phone || "-"}</td>
                  <td style={td}>₹{o.totals?.total ?? "-"}</td>
                  <td style={td}>{o.paymentMethod || "COD"}</td>
                  <td style={td}>
                    {STATUS_LABELS[o.status] || o.status}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
	        {selectedOrder && (
        <div
          style={{
            marginTop: 24,
            padding: 16,
            border: "1px solid #ddd",
            borderRadius: 6,
            background: "#fafafa"
          }}
        >
          <h3>Order Details</h3>

          <p><strong>Order ID:</strong> {selectedOrder._id}</p>
          <p>
            <strong>Date:</strong>{" "}
            {new Date(selectedOrder.createdAt).toLocaleString()}
          </p>
          <p>
  <strong>Customer Phone:</strong>{" "}
  {selectedOrder.customer?.phone || "-"}
</p>
          <p><strong>Payment:</strong> {selectedOrder.paymentMethod || "COD"}</p>
          <p>
  <strong>Status:</strong>{" "}
  <select
    value={localStatus}
    onChange={(e) => setLocalStatus(e.target.value)}
    style={{ marginLeft: 8, padding: 4 }}
  >
    {Object.keys(STATUS_LABELS).map((key) => (
      <option key={key} value={key}>
        {STATUS_LABELS[key]}
      </option>
    ))}
  </select>

  <button
    onClick={async () => {
      try {
        setUpdatingStatus(true);
        await axiosInstance.put(`/admin/orders/${selectedOrder._id}/status`, {
          status: localStatus
        });

        // Update UI immediately
        setOrders((prev) =>
          prev.map((o) =>
            o._id === selectedOrder._id
              ? { ...o, status: localStatus }
              : o
          )
        );

        setSelectedOrder((prev) => ({
          ...prev,
          status: localStatus
        }));

        alert("Order status updated");
      } catch (err) {
        console.error("Status update failed", err);
        alert("Failed to update status");
      } finally {
        setUpdatingStatus(false);
      }
    }}
    disabled={updatingStatus}
    style={{ marginLeft: 12, padding: "4px 10px" }}
  >
    {updatingStatus ? "Saving..." : "Save"}
  </button>
</p>

          <p>
  <strong>Total:</strong> ₹{selectedOrder.totals?.total ?? "-"}
</p>

          {Array.isArray(selectedOrder.items) && (
            <>
              <h4 style={{ marginTop: 12 }}>Items</h4>
              <ul>
                {selectedOrder.items.map((item, idx) => (
                  <li key={idx}>
                    {item.name || "Item"} × {item.qty || item.quantity || 1}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}

    </div>
  );
}

const th = {
  textAlign: "left",
  padding: "10px",
  borderBottom: "1px solid #ddd",
  background: "#fafafa"
};

const td = {
  padding: "10px",
  borderBottom: "1px solid #eee",
  fontSize: 14
};
