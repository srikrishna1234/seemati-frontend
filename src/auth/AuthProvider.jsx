// src/auth/AuthProvider.jsx
import React, { createContext, useContext, useEffect, useState } from "react";
// use the named export jwtDecode (some versions of jwt-decode use named export)
import { jwtDecode } from "jwt-decode";
import api from "../api/axiosInstance";

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const u = localStorage.getItem("user");
      return u ? JSON.parse(u) : null;
    } catch (e) {
      return null;
    }
  });
  const [token, setToken] = useState(() => localStorage.getItem("token") || null);
  const [loading, setLoading] = useState(false);

  // keep token in sync with localStorage
  useEffect(() => {
    if (token) {
      localStorage.setItem("token", token);
      try {
        const decoded = jwtDecode(token);
        // prefer server-provided user object; if missing, derive minimal info
        if (!user) {
          const derived = { id: decoded.sub, exp: decoded.exp };
          setUser(derived);
          localStorage.setItem("user", JSON.stringify(derived));
        }
      } catch (e) {
        // invalid token -> clear
        console.warn("Invalid token during decode", e);
        setToken(null);
        setUser(null);
      }
    } else {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      setUser(null);
    }
  }, [token]);

  function saveTokenAndUser(newToken, userObj = null) {
    setToken(newToken || null);
    if (userObj) {
      setUser(userObj);
      localStorage.setItem("user", JSON.stringify(userObj));
    } else if (newToken) {
      try {
        const decoded = jwtDecode(newToken);
        const derived = { id: decoded.sub, exp: decoded.exp };
        setUser(derived);
        localStorage.setItem("user", JSON.stringify(derived));
      } catch (e) {
        console.warn("Failed to decode token", e);
      }
    }
  }

  function logout() {
    setToken(null);
    setUser(null);
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    try {
      window.location.href = "/admin/login";
    } catch (e) {}
  }

  const value = {
    user,
    token,
    loading,
    setLoading,
    saveTokenAndUser,
    logout,
    api, // export api instance for convenience
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
