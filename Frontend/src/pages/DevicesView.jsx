import React, { useState } from 'react';
import { formatTimeAgo } from '../hooks/useReadings';
import './DevicesView.css';

export default function DevicesView({ devices = [], onSelectDevice, currentDeviceId }) {
  const [selectedModalDevice, setSelectedModalDevice] = useState(null);

  return (
    <div className="devices-page">
      <div className="page-header">
        <h1 className="page-title">Devices</h1>
        <p className="page-subtitle">Every sensing node that has reported to this backend.</p>
      </div>

      <div className="card devices-table-card">
        <div className="devices-table-wrap">
          <table className="devices-table">
            <thead>
              <tr>
                <th className="th-device">DEVICE</th>
                <th className="th-location">LOCATION</th>
                <th className="th-status">STATUS</th>
                <th className="th-aqi">AQI</th>
                <th className="th-lastseen">LAST SEEN</th>
              </tr>
            </thead>
            <tbody>
              {devices.map((device) => {
                const isOnline = device.status === 'Online';
                const timeAgo = formatTimeAgo(device.lastSeen);

                return (
                  <tr
                    key={device.id || device.deviceId}
                    className="device-row"
                    onClick={() => setSelectedModalDevice(device)}
                  >
                    <td className="td-device">
                      <span className="device-name-link">{device.name}</span>
                    </td>
                    <td className="td-location">{device.location}</td>
                    <td className="td-status">
                      <span className="status-indicator">
                        <span
                          className={`status-dot ${isOnline ? 'is-online' : device.status === 'Standby' ? 'is-standby' : 'is-offline'}`}
                        />
                        <span className="status-label">{device.status || 'Offline'}</span>
                      </span>
                    </td>
                    <td className="td-aqi mono">{device.aqi != null ? device.aqi : '—'}</td>
                    <td className="td-lastseen mono">{timeAgo}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Device Details Modal */}
      {selectedModalDevice && (
        <div className="device-modal-backdrop" onClick={() => setSelectedModalDevice(null)}>
          <div className="card device-modal" onClick={(e) => e.stopPropagation()}>
            <div className="device-modal__header">
              <div>
                <h3 className="device-modal__title">{selectedModalDevice.name}</h3>
                <span className="device-modal__subtitle">{selectedModalDevice.location}</span>
              </div>
              <button
                className="device-modal__close"
                onClick={() => setSelectedModalDevice(null)}
              >
                ✕
              </button>
            </div>

            <div className="device-modal__grid">
              <div className="device-modal__item">
                <span className="device-modal__label">Node ID</span>
                <span className="device-modal__val mono">{selectedModalDevice.id}</span>
              </div>
              <div className="device-modal__item">
                <span className="device-modal__label">Hardware</span>
                <span className="device-modal__val">ESP32-WROOM-32</span>
              </div>
              <div className="device-modal__item">
                <span className="device-modal__label">Sensors</span>
                <span className="device-modal__val">MQ135 (Air Quality) + DHT22</span>
              </div>
              <div className="device-modal__item">
                <span className="device-modal__label">Firmware</span>
                <span className="device-modal__val mono">v1.2.0-ieee</span>
              </div>
              <div className="device-modal__item">
                <span className="device-modal__label">Transmission Protocol</span>
                <span className="device-modal__val">HTTPS REST / JSON (15s cycle)</span>
              </div>
              <div className="device-modal__item">
                <span className="device-modal__label">Calibration R0</span>
                <span className="device-modal__val mono">76.63 kΩ (Fresh air baseline)</span>
              </div>
            </div>

            <div className="device-modal__footer">
              <button
                className="btn-primary"
                onClick={() => {
                  onSelectDevice(selectedModalDevice.id);
                  setSelectedModalDevice(null);
                }}
              >
                View on Dashboard
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
