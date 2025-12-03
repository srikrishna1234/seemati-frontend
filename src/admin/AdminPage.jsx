// src/admin/AdminPage.jsx
import React from "react";
import { Routes, Route, Navigate, useNavigate, useParams } from "react-router-dom";

import ProductList from "./ProductList";
import ProductForm from "./ProductForm";

/*
  AdminPage now delegates to nested admin routes:

  - /admin or /admin/           -> redirects to /admin/products
  - /admin/products             -> ProductList (default view)
  - /admin/products/new         -> ProductForm for creating
  - /admin/products/edit/:id    -> ProductForm for editing (id passed as prop)

  This preserves your existing ProductList and ProductForm components and
  switches from the previous side-by-side form+list view to route-based views.
*/

function EditWrapper() {
  // pass id param to ProductForm as a prop
  const { id } = useParams();
  const navigate = useNavigate();

  return (
    <div style={{ padding: 16 }}>
      <ProductForm
        productId={id}
        onSuccess={() => {
          // after saving an edit, return to products list
          navigate("/admin/products", { replace: true });
        }}
      />
    </div>
  );
}

function NewWrapper() {
  const navigate = useNavigate();
  return (
    <div style={{ padding: 16 }}>
      <ProductForm
        onSuccess={() => {
          // after creating a new product, go to products list (or you may reload)
          navigate("/admin/products", { replace: true });
        }}
      />
    </div>
  );
}

export default function AdminPage() {
  return (
    <div style={{ padding: 10 }}>
      <Routes>
        <Route index element={<Navigate to="products" replace />} />

        <Route path="products" element={<ProductList />} />
        <Route path="products/new" element={<NewWrapper />} />
        <Route path="products/edit/:id" element={<EditWrapper />} />

        {/* fallback inside admin subtree => go to products list */}
        <Route path="*" element={<Navigate to="products" replace />} />
      </Routes>
    </div>
  );
}
