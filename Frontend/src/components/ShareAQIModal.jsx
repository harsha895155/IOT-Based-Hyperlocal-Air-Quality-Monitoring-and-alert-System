import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import './ShareAQIModal.css';

export default function ShareAQIModal({
  isOpen,
  onClose,
  placeName = 'Current Location',
  aqi = 0,
  category = 'Good',
  temperature = 25,
  condition = 'Clear Sky',
}) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const appUrl = 'https://airguard-hyperlocal.vercel.app';
  const aqiNum = Math.round(Number(aqi) || 0);

  const shareText = `📍 ${placeName}\n🌿 Air Quality Index (AQI): ${aqiNum} — ${category}\n🌡️ Weather: ${temperature}°C, ${condition}\n🛡️ Monitored live by AirGuard Hyperlocal:\n${appUrl}`;

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (e) {
      console.warn('Clipboard write failed:', e);
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `AirGuard — Live Air Quality in ${placeName}`,
          text: `Current AQI in ${placeName} is ${aqiNum} (${category}) with temperature ${temperature}°C.`,
          url: appUrl,
        });
        onClose();
      } catch (err) {
        // User cancelled or share dismissed
      }
    } else {
      handleCopyText();
    }
  };

  const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;
  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`;

  const modalContent = (
    <div className="share-modal-overlay" onClick={onClose}>
      <div className="share-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="share-modal-header">
          <div className="share-modal-title-wrap">
            <span className="share-badge">📤 Social Air Quality Card</span>
            <h3 className="share-modal-title">Share Live Air Report</h3>
          </div>
          <button type="button" className="share-close-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        {/* Live Preview Card */}
        <div className="share-preview-card">
          <div className="preview-top">
            <span className="preview-pin">📍 {placeName}</span>
            <span className="preview-brand">AirGuard</span>
          </div>

          <div className="preview-body">
            <div className="preview-aqi-box">
              <span className="preview-aqi-num">{aqiNum}</span>
              <span className="preview-aqi-label">AQI</span>
            </div>
            <div className="preview-details">
              <div className="preview-category">{category}</div>
              <div className="preview-weather">
                {temperature}°C · {condition}
              </div>
            </div>
          </div>

          <div className="preview-footer">
            <span>● Real-Time IoT &amp; Satellite Telemetry</span>
            <span className="preview-url">airguard-hyperlocal.vercel.app</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="share-actions-grid">
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="share-action-btn btn-whatsapp"
          >
            <span className="btn-icon">💬</span>
            <span>Share on WhatsApp</span>
          </a>

          <a
            href={twitterUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="share-action-btn btn-twitter"
          >
            <span className="btn-icon">🐦</span>
            <span>Post to Twitter / X</span>
          </a>

          {navigator.share && (
            <button
              type="button"
              className="share-action-btn btn-native"
              onClick={handleNativeShare}
            >
              <span className="btn-icon">📱</span>
              <span>More Apps (Mobile Share)</span>
            </button>
          )}

          <button
            type="button"
            className={`share-action-btn btn-copy ${copied ? 'is-copied' : ''}`}
            onClick={handleCopyText}
          >
            <span className="btn-icon">{copied ? '✓' : '📋'}</span>
            <span>{copied ? 'Copied to Clipboard!' : 'Copy Formatted Text'}</span>
          </button>
        </div>
      </div>
    </div>
  );

  if (typeof document !== 'undefined') {
    return createPortal(modalContent, document.body);
  }
  return modalContent;
}
