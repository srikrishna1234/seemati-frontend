// src/context/CartContext.js
import React, { createContext, useReducer, useContext, useEffect } from "react";

const CartStateContext = createContext(null);
const CartDispatchContext = createContext(null);

const CART_KEY = "seemati_cart_v1";

function loadCart() {
  try {
    const raw = localStorage.getItem(CART_KEY);
    return raw ? JSON.parse(raw) : { items: [] };
  } catch {
    return { items: [] };
  }
}

function saveCart(state) {
  try {
    localStorage.setItem(CART_KEY, JSON.stringify(state));
  } catch {}
}

function calculateTotals(items) {
  const subtotal = items.reduce((s, it) => s + (Number(it.price || 0) * (it.quantity || 1)), 0);
  const shipping = subtotal > 999 ? 0 : 60; // example
  const tax = Math.round(subtotal * 0.05); // 5% example
  const discount = 0;
  const total = subtotal + shipping + tax - discount;
  return { subtotal, shipping, tax, discount, total };
}

function reducer(state, action) {
  switch (action.type) {
    case "INITIALIZE": {
      return action.payload;
    }
    case "ADD_ITEM": {
      const item = action.payload;
      const items = [...state.items];
      const idx = items.findIndex(i => i.productId === item.productId);
      if (idx > -1) {
        items[idx].quantity = Math.min(99, (items[idx].quantity || 1) + (item.quantity || 1));
      } else {
        items.push({ ...item, quantity: item.quantity || 1 });
      }
      const totals = calculateTotals(items);
      const next = { ...state, items, totals };
      saveCart(next);
      return next;
    }
    case "SET_QTY": {
      const { productId, quantity } = action.payload;
      const items = state.items.map(i => i.productId === productId ? { ...i, quantity: Math.max(1, quantity) } : i);
      const totals = calculateTotals(items);
      const next = { ...state, items, totals };
      saveCart(next);
      return next;
    }
    case "REMOVE_ITEM": {
      const items = state.items.filter(i => i.productId !== action.payload.productId);
      const totals = calculateTotals(items);
      const next = { ...state, items, totals };
      saveCart(next);
      return next;
    }
    case "CLEAR_CART": {
      const next = { items: [], totals: calculateTotals([]) };
      saveCart(next);
      return next;
    }
    default:
      return state;
  }
}

export function CartProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, { items: [], totals: calculateTotals([]) });

  // initialize once from localStorage
  useEffect(() => {
    const init = loadCart();
    if (!init.totals) init.totals = calculateTotals(init.items || []);
    dispatch({ type: "INITIALIZE", payload: init });
  }, []);

  return (
    <CartStateContext.Provider value={state}>
      <CartDispatchContext.Provider value={dispatch}>{children}</CartDispatchContext.Provider>
    </CartStateContext.Provider>
  );
}

// SAFE consumer hooks: never return undefined
export function useCartState() {
  const ctx = useContext(CartStateContext);
  // return a safe default if provider missing
  return ctx ?? { items: [], totals: calculateTotals([]) };
}

export function useCartDispatch() {
  const dispatch = useContext(CartDispatchContext);
  // return a no-op dispatch if provider missing (keeps callers safe)
  return dispatch ?? (() => {});
}
