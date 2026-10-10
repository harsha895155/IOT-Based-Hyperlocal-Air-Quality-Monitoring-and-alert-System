import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet, useNavigate, useLocation } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import TopNav from './components/TopNav';
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
import {
  LiveMonitoringView,
  AirQualityView,
} from './pages/OtherViews';

import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { useReadings } from './hooks/useReadings';
import './App.css';

/**
 * AppLayout
 * Shared dashboard/application shell for monitoring views.
 * Contains responsive Sidebar, TopNav, and routed content via <Outlet />.
 */
function AppLayout({ readingsData }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { connected, unreadAlertsCount } = readingsData;

  return (
    <div className="app-layout">
      <Sidebar
        isOpen={sidebarOpen}
        setIsOpen={setSidebarOpen}
        unreadAlerts={unreadAlertsCount}
      />

      <div className="app-main">
        <TopNav
          onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
          connected={connected}
          unreadAlerts={unreadAlertsCount}
        />

        <main className="app-content">
          <Outlet />
        </main>
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
  const { alerts, devices, acknowledgeAlert } = readingsData;

  return (
    <Routes>
      {/* ─── 1. PUBLIC WELCOME / LANDING PAGE ─── */}
      <Route path="/" element={<WelcomePage />} />

      {/* ─── 2. DEDICATED LOGIN / REGISTER / RESET ─── */}
      <Route path="/login" element={<LoginView />} />
      <Route path="/reset-password" element={<LoginView />} />

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
            <ProtectedRoute>
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

export default function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <BrowserRouter>
          <ScrollToTop />
          <AppRoutes />
        </BrowserRouter>
      </ThemeProvider>
    </AuthProvider>
  );
}
