import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet, useNavigate, useLocation } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import TopNav from './components/TopNav';
import MobileBottomBar from './components/MobileBottomBar';
import ProtectedRoute from './components/ProtectedRoute';

/**
 * ScrollToTop
 * Ensures that whenever navigating from one slide/view to another,
 * the slide starts from the beginning (top: 0).
 */
function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    // 1. Reset standard window/document scroll
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    if (document.documentElement) document.documentElement.scrollTop = 0;
    if (document.body) document.body.scrollTop = 0;

    // 2. Reset app layout main scroll container
    const appMain = document.querySelector('.app-main');
    if (appMain) appMain.scrollTop = 0;

    // 3. Reset app-content container
    const appContent = document.querySelector('.app-content');
    if (appContent) appContent.scrollTop = 0;

    // 4. Reset individual slide containers
    const views = document.querySelectorAll(
      '.devices-view, .weather-dashboard, .locations-view, .analytics-view, .history-view, .reports-view, .settings-view, .alerts-view, .device-detail-container, .system-health-view'
    );
    views.forEach((v) => {
      if (v) v.scrollTop = 0;
    });
  }, [pathname]);

  return null;
}

import WelcomePage from './pages/WelcomePage';
import Dashboard from './pages/Dashboard';
import AlertsView from './pages/AlertsView';
import DevicesView from './pages/DevicesView';
import DeviceDetailView from './pages/DeviceDetailView';
import SettingsView from './pages/SettingsView';
import LoginView from './pages/LoginView';
import LocationsView from './pages/LocationsView';
import AnalyticsView from './pages/AnalyticsView';
import HistoryView from './pages/HistoryView';
import ReportsView from './pages/ReportsView';
import SystemHealthView from './pages/SystemHealthView';
import HelpSupportView from './pages/HelpSupportView';
import ProfileView from './pages/ProfileView';
import PrivacyPolicyView from './pages/PrivacyPolicyView';
import {
  LiveMonitoringView,
  AirQualityView,
} from './pages/OtherViews';

import { AuthProvider } from './context/AuthContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import AirAmbient3DCanvas from './components/AirAmbient3DCanvas';
import DangerAlarmFlash from './components/DangerAlarmFlash';
import InitialPermissionsModal from './components/InitialPermissionsModal';
import Loading3DPage from './components/Loading3DPage';
import { useReadings } from './hooks/useReadings';
import { subscribeToEmergencyPush, isPushSupported } from './utils/pushManager';
import './App.css';

/**
 * AppLayout
 * Shared dashboard/application shell for monitoring views.
 * Contains responsive Sidebar, TopNav, and routed content via <Outlet />.
 */
function AppLayout({ readingsData }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    return localStorage.getItem('airguard_sidebar_collapsed') === 'true';
  });
  const { connected, unreadAlertsCount } = readingsData;
  const { resolvedTheme } = useTheme() || {};
  const location = useLocation();

  const handleToggleSidebar = () => {
    if (window.innerWidth <= 900) {
      setMobileOpen((prev) => !prev);
    } else {
      setIsCollapsed((prev) => {
        const next = !prev;
        localStorage.setItem('airguard_sidebar_collapsed', String(next));
        return next;
      });
    }
  };

  return (
    <div className={`app-layout ${isCollapsed ? 'is-collapsed' : ''}`}>
      {/* Page & Slide Specific 3D Atmospheric Background */}
      <AirAmbient3DCanvas theme={resolvedTheme} routePath={location.pathname} aqi={readingsData?.latest?.airQuality} />

      <Sidebar
        isOpen={mobileOpen}
        setIsOpen={setMobileOpen}
        isCollapsed={isCollapsed}
        unreadAlerts={unreadAlertsCount}
      />

      <div className="app-main">
        <TopNav
          onToggleSidebar={handleToggleSidebar}
          isSidebarCollapsed={isCollapsed}
          connected={connected}
          unreadAlerts={unreadAlertsCount}
          isDeviceOnline={readingsData?.isCurrentDeviceOnline}
          activeDevicesCount={readingsData?.activeDevicesCount}
        />

        <main className="app-content">
          {readingsData?.isOffline && (
            <div className="offline-mode-pill-banner" role="status">
              <span className="offline-pulse-dot" />
              <span className="offline-banner-title">📡 OFFLINE CACHE ACTIVE:</span>
              <span className="offline-banner-desc">
                Displaying cached environmental telemetry, historical trends & station diagnostics. Only live IoT node streaming requires internet connection.
              </span>
            </div>
          )}
          <Outlet />
        </main>

        <MobileBottomBar
          unreadAlerts={unreadAlertsCount}
          onOpenMenu={() => setMobileOpen(true)}
        />
      </div>
    </div>
  );
}

/**
 * AppRoutes
 * Master route registry for AirGuard platform.
 * Supports deep linking, reload persistence, and role-based access control.
 */
function AppRoutes() {
  const navigate = useNavigate();
  const readingsData = useReadings();
  const { alerts, devices, acknowledgeAlert, selectedDevice } = readingsData;

  // Background Web Push synchronization: only when user enabled permission in Settings
  useEffect(() => {
    const isPushAllowedInSettings = localStorage.getItem('airguard_push_active') === 'true';
    if (
      isPushAllowedInSettings &&
      isPushSupported() &&
      typeof Notification !== 'undefined' &&
      Notification.permission === 'granted'
    ) {
      subscribeToEmergencyPush(selectedDevice).catch(() => {});
    }
  }, [selectedDevice]);

  return (
    <Routes>
      {/* ─── 1. PUBLIC WELCOME / LANDING PAGE ─── */}
      <Route path="/" element={<WelcomePage />} />

      {/* ─── 2. DEDICATED LOGIN / REGISTER / RESET / PRIVACY ─── */}
      <Route path="/login" element={<LoginView />} />
      <Route path="/reset-password" element={<LoginView />} />
      <Route path="/privacy" element={<PrivacyPolicyView />} />

      {/* ─── 3. MONITORING PLATFORM APPLICATION (WITH APP SHELL) ─── */}
      <Route element={<AppLayout readingsData={readingsData} />}>
        {/* Public Monitoring Routes (Accessible to both Guests and Registered Users) */}
        <Route
          path="/dashboard"
          element={
            <Dashboard
              readingsData={readingsData}
              onNavigateTab={(tab) => navigate('/' + tab)}
            />
          }
        />

        <Route
          path="/devices"
          element={
            <DevicesView
              devices={devices}
              onSelectDevice={(id) => {
                readingsData.setSelectedDevice(id);
                navigate('/dashboard');
              }}
              currentDeviceId={readingsData.selectedDevice}
              onDeleteDevice={readingsData.removeDevice}
            />
          }
        />

        {/* Deep link device detail page */}
        <Route
          path="/devices/:id"
          element={<DeviceDetailView readingsData={readingsData} />}
        />

        <Route path="/locations" element={<LocationsView />} />

        <Route path="/analytics" element={<AnalyticsView trend={readingsData.trend} />} />
        <Route path="/history" element={<HistoryView trend={readingsData.trend} />} />

        <Route
          path="/alerts"
          element={
            <AlertsView
              alerts={alerts}
              devices={devices}
              onAcknowledge={acknowledgeAlert}
              onAcknowledgeAll={readingsData.acknowledgeAllAlerts}
              onNavigateLogin={() => navigate('/login')}
            />
          }
        />

        <Route path="/reports" element={<ReportsView />} />
        <Route path="/live" element={<LiveMonitoringView readingsData={readingsData} />} />
        <Route path="/air-quality" element={<AirQualityView readingsData={readingsData} />} />

        {/* ─── 4. PROTECTED ROUTES (STRICTLY RESERVED FOR REGISTERED USERS) ─── */}
        <Route
          path="/system-health"
          element={
            <ProtectedRoute requireAdmin={true}>
              <SystemHealthView />
            </ProtectedRoute>
          }
        />

        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <SettingsView />
            </ProtectedRoute>
          }
        />

        <Route
          path="/help"
          element={
            <ProtectedRoute>
              <HelpSupportView />
            </ProtectedRoute>
          }
        />

        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <ProfileView onNavigateLogin={() => navigate('/login')} />
            </ProtectedRoute>
          }
        />
      </Route>

      {/* ─── 5. CATCH-ALL FALLBACK ─── */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

function AppContent() {
  const [isAppLoading, setIsAppLoading] = useState(true);

  useEffect(() => {
    const handleTriggerLoading = (e) => {
      setIsAppLoading(true);
      const duration = e?.detail?.duration || 1800;
      setTimeout(() => setIsAppLoading(false), duration);
    };

    window.addEventListener('airguard:trigger-loading', handleTriggerLoading);
    return () => window.removeEventListener('airguard:trigger-loading', handleTriggerLoading);
  }, []);

  return (
    <>
      {isAppLoading && (
        <Loading3DPage
          minDuration={1600}
          onLoaded={() => setIsAppLoading(false)}
        />
      )}
      <ScrollToTop />
      <DangerAlarmFlash />
      <InitialPermissionsModal />
      <AppRoutes />
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <BrowserRouter>
          <AppContent />
        </BrowserRouter>
      </ThemeProvider>
    </AuthProvider>
  );
}

