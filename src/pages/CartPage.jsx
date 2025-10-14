import React from "react";
import { useCartState, useCartDispatch } from "../context/CartContext";
import { useNavigate } from "react-router-dom";

export default function CartPage(){
  const state = useCartState();
  const dispatch = useCartDispatch();
  const navigate = useNavigate();

  if(!state) return null;

  const { items, totals } = state;

  return (
    <div style={{ padding: 20 }}>
      <h2>Your Cart</h2>
      {items.length === 0 ? (
        <div>No items. <button onClick={()=>navigate("/shop")}>Go shopping</button></div>
      ) : (
        <>
          <div>
            {items.map(it => (
              <div key={it.productId} style={{ display:"flex", gap:12, alignItems:"center", marginBottom:12 }}>
                <img src={it.image} alt={it.title} style={{ width:84, height:84, objectFit:"cover" }} />
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:700 }}>{it.title}</div>
                  <div>₹{it.price} x {it.quantity} = ₹{Number(it.price)*it.quantity}</div>
                  <div style={{ marginTop:8 }}>
                    <button onClick={()=>dispatch({type:"SET_QTY", payload:{productId:it.productId, quantity: Math.max(1, it.quantity-1)}})}>-</button>
                    <span style={{ padding:"0 8px" }}>{it.quantity}</span>
                    <button onClick={()=>dispatch({type:"SET_QTY", payload:{productId:it.productId, quantity: Math.min(99, it.quantity+1)}})}>+</button>
                    <button onClick={()=>dispatch({type:"REMOVE_ITEM", payload:{productId: it.productId}})} style={{ marginLeft:12 }}>Remove</button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ borderTop:"1px solid #eee", paddingTop:12, marginTop:12 }}>
            <div>Subtotal: ₹{totals.subtotal}</div>
            <div>Shipping: ₹{totals.shipping}</div>
            <div>Tax: ₹{totals.tax}</div>
            <div style={{ fontWeight:700, marginTop:6 }}>Total: ₹{totals.total}</div>

            <div style={{ marginTop:12 }}>
              <button onClick={()=>navigate("/checkout")} style={{ padding:"10px 16px", background:"#2563eb", color:"#fff", border:"none", borderRadius:6 }}>Proceed to Checkout</button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
