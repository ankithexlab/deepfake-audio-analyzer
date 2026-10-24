import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  getStoredToken,
  setStoredToken,
  removeStoredToken,
  loginUser,
  signupUser,
  guestLoginUser,
  getCurrentUserProfile
} from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('deepfake_auth_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState(() => getStoredToken());
  const [isLoading, setIsLoading] = useState(true);

  // Validate session on mount if token is present
  useEffect(() => {
    let isMounted = true;
    async function initAuth() {
      const activeToken = getStoredToken();
      if (!activeToken) {
        if (isMounted) {
          setUser(null);
          setToken(null);
          removeStoredToken();
          setIsLoading(false);
        }
        return;
      }
      try {
        const profile = await getCurrentUserProfile();
        if (isMounted) {
          if (profile) {
            setUser(profile);
            setToken(activeToken);
            localStorage.setItem('deepfake_auth_user', JSON.stringify(profile));
          } else {
            // Invalid or expired token: strictly wipe state
            setUser(null);
            setToken(null);
            removeStoredToken();
          }
        }
      } catch (err) {
        console.warn('Auth verification error:', err);
        if (isMounted) {
          setUser(null);
          setToken(null);
          removeStoredToken();
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    initAuth();
    return () => { isMounted = false; };
  }, []);

  // Listen for 401 session expiry events dispatched by API client
  useEffect(() => {
    const handleExpired = () => {
      setToken(null);
      setUser(null);
      removeStoredToken();
    };
    window.addEventListener('deepfake:auth_expired', handleExpired);
    return () => {
      window.removeEventListener('deepfake:auth_expired', handleExpired);
    };
  }, []);

  const login = useCallback(async (credentials) => {
    const data = await loginUser(credentials);
    setToken(data.token);
    setUser(data.user);
    setStoredToken(data.token);
    localStorage.setItem('deepfake_auth_user', JSON.stringify(data.user));
    return data;
  }, []);

  const signup = useCallback(async (userData) => {
    const data = await signupUser(userData);
    setToken(data.token);
    setUser(data.user);
    setStoredToken(data.token);
    localStorage.setItem('deepfake_auth_user', JSON.stringify(data.user));
    return data;
  }, []);

  const guestLogin = useCallback(async () => {
    const data = await guestLoginUser();
    setToken(data.token);
    setUser(data.user);
    setStoredToken(data.token);
    localStorage.setItem('deepfake_auth_user', JSON.stringify(data.user));
    return data;
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    removeStoredToken();
    localStorage.removeItem('deepfake_auth_user');
  }, []);

  const value = {
    user,
    token,
    isAuthenticated: Boolean(token && user),
    isGuest: Boolean(user?.isGuest || user?.role === 'guest'),
    isLoading,
    login,
    signup,
    guestLogin,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// oxlint-disable-next-line react/only-export-components
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
