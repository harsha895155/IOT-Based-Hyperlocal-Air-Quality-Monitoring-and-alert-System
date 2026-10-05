import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import TopNav from './components/TopNav';
import Dashboard from './pages/Dashboard';
import AlertsView from './pages/AlertsView';
import DevicesView from './pages/DevicesView';
import SettingsView from './pages/SettingsView';
import LoginView from './pages/LoginView';
import {
  LiveMonitoringView,
  AirQualityView,
  LocationsView,
  AnalyticsView,
  HistoryView,
  ReportsView,
  SystemHealthView,
  HelpSupportView,
  ProfileView,
} from './pages/OtherViews';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { useReadings } from './hooks/useReadings';
import './App.css';

function MainLayout() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const readingsData = useReadings();
  const { alerts, devices, connected, unreadAlertsCount, acknowledgeAlert } = readingsData;

  // Image 4 is a dedicated full-bleed split view for Login
  if (activeTab === 'login') {
    return <LoginView onBackToHome={() => setActiveTab('dashboard')} />;
  }

  return (
    <div className="app-layout">
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isOpen={sidebarOpen}
        setIsOpen={setSidebarOpen}
        unreadAlerts={unreadAlertsCount}
      />

      <div className="app-main">
        <TopNav
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
          connected={connected}
          unreadAlerts={unreadAlertsCount}
        />

        <main className="app-content">
          {activeTab === 'dashboard' && (
            <Dashboard
              readingsData={readingsData}
              onNavigateTab={setActiveTab}
            />
          )}

          {activeTab === 'alerts' && (
            <AlertsView
              alerts={alerts}
              onAcknowledge={acknowledgeAlert}
              onNavigateLogin={() => setActiveTab('login')}
            />
          )}

          {activeTab === 'devices' && (
            <DevicesView
              devices={devices}
              onSelectDevice={(id) => {
                readingsData.setSelectedDevice(id);
                setActiveTab('dashboard');
              }}
              currentDeviceId={readingsData.selectedDevice}
            />
          )}

          {activeTab === 'settings' && <SettingsView />}

          {activeTab === 'live' && <LiveMonitoringView readingsData={readingsData} />}

          {activeTab === 'air-quality' && <AirQualityView readingsData={readingsData} />}

          {activeTab === 'locations' && (
            <LocationsView
              locations={readingsData.locations}
              devices={devices}
              selectedDevice={readingsData.selectedDevice}
              onSelectDevice={(id) => {
                readingsData.setSelectedDevice(id);
                setActiveTab('dashboard');
              }}
            />
          )}

          {activeTab === 'analytics' && <AnalyticsView trend={readingsData.trend} />}

          {activeTab === 'history' && <HistoryView trend={readingsData.trend} />}

          {activeTab === 'reports' && <ReportsView />}

          {activeTab === 'health' && <SystemHealthView connected={connected} />}

          {activeTab === 'help' && <HelpSupportView />}

          {activeTab === 'profile' && (
            <ProfileView onNavigateLogin={() => setActiveTab('login')} />
          )}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <MainLayout />
      </ThemeProvider>
    </AuthProvider>
  );
}
