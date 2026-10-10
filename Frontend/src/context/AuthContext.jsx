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

      // Refresh latest profile and preferences from MongoDB Atlas
      client
        .get('/auth/me')
        .then((res) => {
          if (res.data) {
            setUser(res.data);
            if (res.data.preferences) {
              setPreferences((prev) => ({ ...prev, ...res.data.preferences }));
              const accKey = (res.data._id || res.data.id || res.data.email || '').toLowerCase();
              if (accKey && res.data.preferences.defaultStation) {
                localStorage.setItem(`airguard_station_pref_${accKey}`, res.data.preferences.defaultStation);
              }
            }
          }
        })
        .catch((e) => {
          console.warn('Could not verify existing session token:', e.message);
        });
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
        const accKey = (res.data.user.id || res.data.user._id || res.data.user.email || '').toLowerCase();
        if (accKey && res.data.user.preferences.defaultStation) {
          localStorage.setItem(`airguard_station_pref_${accKey}`, res.data.user.preferences.defaultStation);
        }
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
        const res = await client.patch('/auth/preferences', newPrefs);
        if (res.data?.user) {
          setUser((prev) => ({ ...prev, ...res.data.user }));
        }
        if (res.data?.preferences) {
          setPreferences((prev) => ({ ...prev, ...res.data.preferences }));
        }
        return res.data;
      } catch (e) {
        console.warn('Could not sync preferences with backend:', e.message);
        throw e;
      }
    }
    return { preferences: newPrefs };
  };

  const changePassword = async (currentPassword, newPassword) => {
    try {
      const res = await client.patch('/auth/change-password', {
        currentPassword,
        newPassword,
      });
      return res.data;
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Failed to update password.';
      throw new Error(msg);
    }
  };

  const loginWithGoogle = async (googleData) => {
    try {
      const res = await client.post('/auth/google', googleData);
      setToken(res.data.token);
      setUser(res.data.user);
      if (res.data.user.preferences) {
        setPreferences((prev) => ({ ...prev, ...res.data.user.preferences }));
      }
      setIsGuest(false);
      return { success: true };
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Google authentication failed.';
      throw new Error(msg);
    }
  };

  const forgotPassword = async (email) => {
    try {
      const res = await client.post('/auth/forgot-password', { email });
      return res.data;
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Failed to request password reset.';
      throw new Error(msg);
    }
  };

  const resetPassword = async (resetToken, newPassword) => {
    try {
      const res = await client.post('/auth/reset-password', { token: resetToken, newPassword });
      if (res.data.token) {
        setToken(res.data.token);
        setUser(res.data.user);
        setIsGuest(false);
      }
      return res.data;
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Failed to reset password.';
      throw new Error(msg);
    }
  };

  const updateProfile = async (profileData) => {
    try {
      const res = await client.put('/auth/profile', profileData);
      if (res.data?.user) {
        setUser(res.data.user);
      }
      return res.data;
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Failed to update profile.';
      throw new Error(msg);
    }
  };

  const deleteAccount = async (confirmation) => {
    try {
      const res = await client.delete('/auth/account', { data: { confirmation } });
      logout();
      return res.data;
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Failed to delete account.';
      throw new Error(msg);
    }
  };

  const refreshUser = async () => {
    if (token) {
      try {
        const res = await client.get('/auth/me');
        if (res.data) setUser(res.data);
      } catch (e) {}
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
        loginWithGoogle,
        forgotPassword,
        resetPassword,
        logout,
        continueAsGuest,
        updatePreferences,
        updateProfile,
        changePassword,
        deleteAccount,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
