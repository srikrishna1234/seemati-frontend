// frontend/src/store/cartSlice.js
import { createSlice } from "@reduxjs/toolkit";

const cartSlice = createSlice({
  name: "cart",
  initialState: [],
  reducers: {
    addToCart: (state, action) => {
      const { product, qty, size, color } = action.payload;
      const existing = state.find((item) => item.product._id === product._id && item.size === size && item.color === color);

      if (existing) {
        existing.qty += qty;
      } else {
        state.push({ product, qty, size, color });
      }
    },
    removeFromCart: (state, action) => {
      return state.filter((item) => item.product._id !== action.payload);
    },
    clearCart: () => {
      return [];
    },
  },
});

export const { addToCart, removeFromCart, clearCart } = cartSlice.actions;
export default cartSlice.reducer;
