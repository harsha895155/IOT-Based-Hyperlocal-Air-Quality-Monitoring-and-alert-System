import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './styles/global.css';

// Auto unregister any stale/broken service workers from previous builds and register clean worker
if ('serviceWorker' in navigator && window.location.protocol.startsWith('http')) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (const reg of registrations) {
        reg.update().catch(() => {});
      }
    });

    navigator.serviceWorker
      .register('/sw.js?v=2.4.1', { scope: '/' })
      .then((registration) => {
        registration.update();
        console.log('[PWA] ServiceWorker active with scope:', registration.scope);
      })
      .catch((err) => {
        console.warn('[PWA] ServiceWorker registration failed:', err);
      });
  });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
