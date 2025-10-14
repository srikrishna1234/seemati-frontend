import React from "react";
import ProductList from "./ProductList";
import ProductForm from "./ProductForm";

export default function AdminPage() {
  return (
    <div style={{ display: "flex", gap: 20, padding: 20 }}>
      <div style={{ flex: 1 }}>
        <ProductForm onSuccess={() => window.location.reload()} />
      </div>
      <div style={{ flex: 3 }}>
        <ProductList />
      </div>
    </div>
  );
}
