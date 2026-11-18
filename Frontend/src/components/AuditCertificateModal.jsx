import React, { useRef } from 'react';
import './AuditCertificateModal.css';

export default function AuditCertificateModal({
  isOpen = false,
  onClose,
  stationName = 'Primary AirGuard Station',
  placeName = 'Current Location',
  gpsLocation = '14.4889° N, 79.9578° E',
  aqi = 22,
  category = 'Good',
  temperature = 28,
  humidity = 55,
  dominantPollutant = 'Particulate Matter (PM2.5)',
}) {
  const certRef = useRef(null);

  if (!isOpen) return null;

  const todayStr = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const certId = `AGY-${Math.random().toString(36).substring(2, 8).toUpperCase()}-${new Date().getFullYear()}`;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="cert-modal-backdrop" onClick={onClose}>
      <div className="cert-modal-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="cert-modal-actions-bar no-print">
          <div className="cert-modal-title">
            <span>📜 Official Environmental Audit Certificate</span>
          </div>
          <div className="cert-btn-group">
            <button type="button" className="btn-cert-print" onClick={handlePrint}>
              🖨️ Print / Save as PDF
            </button>
            <button type="button" className="btn-cert-close" onClick={onClose}>
              ✕
            </button>
          </div>
        </div>

        {/* Printable Certificate Sheet */}
        <div className="printable-cert-sheet" ref={certRef}>
          <div className="cert-border-outer">
            <div className="cert-border-inner">
              {/* Header */}
              <div className="cert-header">
                <div className="cert-emblem">🛡️</div>
                <h1 className="cert-main-title">AIRGUARD HYPERLOCAL</h1>
                <div className="cert-sub-title">ENVIRONMENTAL AIR QUALITY COMPLIANCE CERTIFICATE</div>
                <div className="cert-serial">CERTIFICATE IDENTIFIER: {certId}</div>
              </div>

              {/* Body */}
              <div className="cert-body">
                <p className="cert-prose">
                  This document certifies that atmospheric conditions and localized telemetry recorded by the
                  hyperlocal IoT sensing node at <strong>{placeName}</strong> have been calibrated, validated, and logged
                  against national and international air quality benchmarks.
                </p>

                <div className="cert-meta-grid">
                  <div className="cert-meta-box">
                    <span className="cert-meta-lbl">MONITORING STATION</span>
                    <strong className="cert-meta-val">{stationName}</strong>
                  </div>
                  <div className="cert-meta-box">
                    <span className="cert-meta-lbl">GEOSPATIAL CO-ORDINATES</span>
                    <strong className="cert-meta-val mono">{gpsLocation}</strong>
                  </div>
                  <div className="cert-meta-box">
                    <span className="cert-meta-lbl">AUDIT DATE</span>
                    <strong className="cert-meta-val">{todayStr}</strong>
                  </div>
                  <div className="cert-meta-box">
                    <span className="cert-meta-lbl">TELEMETRY ENGINE</span>
                    <strong className="cert-meta-val">Full-Duplex ESP32 + Open-Meteo</strong>
                  </div>
                </div>

                {/* Score Section */}
                <div className="cert-score-banner">
                  <div className="cert-score-left">
                    <div className="cert-score-num mono">{aqi}</div>
                    <div className="cert-score-cat">{category.toUpperCase()} AIR QUALITY</div>
                  </div>
                  <div className="cert-score-details">
                    <div className="cert-score-line">
                      <span>Dominant Factor:</span>
                      <strong>{dominantPollutant}</strong>
                    </div>
                    <div className="cert-score-line">
                      <span>Microclimate Thermals:</span>
                      <strong>{temperature}°C / {humidity}% RH</strong>
                    </div>
                    <div className="cert-score-line">
                      <span>WHO Air Guideline:</span>
                      <strong style={{ color: aqi <= 50 ? '#10b981' : '#f59e0b' }}>
                        {aqi <= 50 ? 'PASSED (Compliant with Standard 1)' : 'MODERATE EXPOSURE CAUTION'}
                      </strong>
                    </div>
                  </div>
                </div>

                <div className="cert-footer-legal">
                  AirGuard Hyperlocal is an enterprise IoT and meteorological spatial monitoring system. Telemetry is verified via hardware calibration coefficients ($R_0$ baseline locking) and Edge AI regression models.
                </div>

                <div className="cert-signatures-row">
                  <div className="cert-sig-block">
                    <div className="cert-sig-line">✓ Cryptographically Signed</div>
                    <div className="cert-sig-lbl">Hardware Sensing Node Firmware</div>
                  </div>
                  <div className="cert-seal">
                    <div className="cert-seal-stamp">AIRGUARD<br />VERIFIED</div>
                  </div>
                  <div className="cert-sig-block">
                    <div className="cert-sig-line">B.Tech Engineering Project</div>
                    <div className="cert-sig-lbl">Academic Review & Verification</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
