import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

const decodeToken = (token) => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      window.atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    console.error("JWT decoding failed:", e);
    return null;
  }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [accessToken, setAccessToken] = useState(() => localStorage.getItem('access_token'));
  const [refreshToken, setRefreshToken] = useState(() => localStorage.getItem('refresh_token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (accessToken) {
      const decoded = decodeToken(accessToken);
      if (decoded) {
        setUser({
          id: decoded.user_id,
          username: decoded.username,
          email: decoded.email,
          role: decoded.role,
        });
      } else {
        logout();
      }
    }
    setLoading(false);
  }, [accessToken]);

  const login = async (username, password) => {
    try {
      const response = await axios.post('http://localhost:8000/api/token/', {
        username,
        password
      });
      const { access, refresh } = response.data;
      
      localStorage.setItem('access_token', access);
      localStorage.setItem('refresh_token', refresh);
      
      setAccessToken(access);
      setRefreshToken(refresh);

      const decoded = decodeToken(access);
      const userProfile = {
        id: decoded.user_id,
        username: decoded.username,
        email: decoded.email,
        role: decoded.role,
      };
      
      setUser(userProfile);
      return userProfile;
    } catch (err) {
      console.error("Authentication login error:", err);
      throw err;
    }
  };

  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    setAccessToken(null);
    setRefreshToken(null);
    setUser(null);
  };

  const updateAccessToken = (newAccess) => {
    localStorage.setItem('access_token', newAccess);
    setAccessToken(newAccess);
    const decoded = decodeToken(newAccess);
    if (decoded) {
      setUser({
        id: decoded.user_id,
        username: decoded.username,
        email: decoded.email,
        role: decoded.role,
      });
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      accessToken,
      refreshToken,
      loading,
      login,
      logout,
      updateAccessToken
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be consumed within an AuthProvider wrapper');
  }
  return context;
};
