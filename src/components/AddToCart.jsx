// src/components/AddToCart.jsx
import React from "react";
import PropTypes from "prop-types";
import { useCartDispatch } from "../context/CartContext";

/**
 * AddToCart
 * Props:
 *  - product: full product object (must have id/_id/title/price/images)
 *  - quantity (number)
 *  - options (object)  // e.g. { color: 'blue', size: 'L' }
 */
export default function AddToCart({ product, quantity = 1, options = {}, children }) {
  const dispatch = useCartDispatch();

  function handleAdd() {
  if (!product) return;

  const id = product._id || product.id || product.productId;

  const item = {
    productId: id,
    title: product.title || product.name || "Product",
    sku: product.sku || "",
    price: Number(product.price ?? product.mrp ?? 0),
    quantity: Number(quantity || 1),
    color: options.color || "",
    size: options.size || "",
    image:
      (product.images && product.images[0] && (product.images[0].url || product.images[0])) ||
      product.thumbnail ||
      "",
  };

  dispatch({
    type: "ADD_ITEM",
    payload: item,
  });

  // optional event hook
  try {
    window.dispatchEvent(new CustomEvent("cart-item-added", { detail: item }));
  } catch (e) {}
}

  return (
    <button type="button" onClick={handleAdd} className="btn-add-to-cart">
      {children || "Add to cart"}
    </button>
  );
}

AddToCart.propTypes = {
  product: PropTypes.object.isRequired,
  quantity: PropTypes.number,
  options: PropTypes.object,
};
