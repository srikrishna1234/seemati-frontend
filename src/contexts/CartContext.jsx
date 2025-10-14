// src/contexts/CartContext.jsx
// shim that re-exports whatever is in src/context/CartContext.jsx
// This avoids having to change many import paths across the project.

export { default, CartProvider, useCart, useCartDispatch } from "../context/CartContext";
