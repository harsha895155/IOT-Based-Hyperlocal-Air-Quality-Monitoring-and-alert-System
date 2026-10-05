import React, { createContext, useContext, useState, useEffect } from 'react';
import client from '../api/client';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('airguard_token') || null);
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('airguard_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [isGuest, setIsGuest] = useState(() => !localStorage.getItem('airguard_token'));
  const [preferences, setPreferences] = useState(() => {
    const saved = localStorage.getItem('airguard_prefs');
    return saved
      ? JSON.parse(saved)
      : { emailAlerts: true, pushAlerts: true, theme: 'obsidian', refreshRate: 15 };
  });

  useEffect(() => {
    if (token) {
      localStorage.setItem('airguard_token', token);
      client.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      localStorage.removeItem('airguard_token');
      delete client.defaults.headers.common['Authorization'];
    }
  }, [token]);

  useEffect(() => {
    if (user) {
      localStorage.setItem('airguard_user', JSON.stringify(user));
      setIsGuest(false);
    } else {
      localStorage.removeItem('airguard_user');
      setIsGuest(true);
    }
  }, [user]);

  useEffect(() => {
    localStorage.setItem('airguard_prefs', JSON.stringify(preferences));
  }, [preferences]);

  // Real backend authentication (R4, Section 10) - no fake user fallbacks
  const login = async (email, password) => {
    try {
      const res = await client.post('/auth/login', { email, password });
      setToken(res.data.token);
      setUser(res.data.user);
      if (res.data.user.preferences) {
        setPreferences((prev) => ({ ...prev, ...res.data.user.preferences }));
      }
      setIsGuest(false);
      return { success: true };
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Login failed. Please verify credentials.';
      throw new Error(msg);
    }
  };

  const register = async (name, email, password) => {
    try {
      const res = await client.post('/auth/register', { name, email, password });
      setToken(res.data.token);
      setUser(res.data.user);
      setIsGuest(false);
      return { success: true };
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Registration failed.';
      throw new Error(msg);
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    setIsGuest(true);
  };

  const continueAsGuest = () => {
    setToken(null);
    setUser(null);
    setIsGuest(true);
  };

  const updatePreferences = async (newPrefs) => {
    setPreferences((prev) => ({ ...prev, ...newPrefs }));

    if (token) {
      try {
        await client.patch('/auth/preferences', newPrefs);
      } catch (e) {
        console.warn('Could not sync preferences with backend:', e.message);
      }
    }
  };

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        isGuest,
        preferences,
        login,
        register,
        logout,
        continueAsGuest,
        updatePreferences,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
