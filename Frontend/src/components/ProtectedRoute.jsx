import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * ProtectedRoute
 * Ensures only authenticated/registered users can access system, settings,
 * profile, and administrative features.
 * Guests and unauthenticated users are redirected to login with return destination.
 */
export default function ProtectedRoute({ children, requireAdmin = false }) {
  const { user, isGuest } = useAuth();
  const location = useLocation();

  if (isGuest || !user) {
    return <Navigate to="/login" state={{ from: location, message: 'This section requires a registered AirGuard account.' }} replace />;
  }

  if (requireAdmin && user.role !== 'admin') {
    return <Navigate to="/dashboard" state={{ message: 'Administrator privileges required to access this infrastructure view.' }} replace />;
  }

  return children;
}
