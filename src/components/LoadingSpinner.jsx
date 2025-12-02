// src/components/LoadingSpinner.jsx
import React from "react";

const LoadingSpinner = () => {
  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 40
    }}>
      <div aria-hidden="true" style={{
        width: 48,
        height: 48,
        borderRadius: "50%",
        border: "5px solid rgba(0,0,0,0.1)",
        borderTopColor: "rgba(0,0,0,0.7)",
        animation: "spin 1s linear infinite"
      }} />
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default LoadingSpinner;
