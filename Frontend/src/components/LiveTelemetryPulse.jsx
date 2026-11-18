import React, { useState, useEffect } from 'react';
import './LiveTelemetryPulse.css';

export default function LiveTelemetryPulse({
  isConnected = false,
  deviceName = 'esp32-node-01',
  lastSeenTime = null,
  isLiveLocation = false,
}) {
  const [secondsAgo, setSecondsAgo] = useState(0);

  useEffect(() => {
    // When lastSeenTime changes, reset counter
    setSecondsAgo(0);

    const interval = setInterval(() => {
      setSecondsAgo((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [lastSeenTime]);

  const getTimeString = () => {
    if (secondsAgo < 4) return 'Just now';
    if (secondsAgo < 60) return `${secondsAgo}s ago`;
    const mins = Math.floor(secondsAgo / 60);
    return `${mins}m ${secondsAgo % 60}s ago`;
  };

  return (
    <div className={`live-telemetry-strip ${isConnected ? 'is-streaming' : 'is-standby'}`}>
      <div className="telemetry-left">
        <span className="live-radar-dot">
          <span className="radar-ring" />
          <span className="radar-core" />
        </span>
        <span className="live-label">
          {isConnected ? 'LIVE WEBSOCKET STREAM' : (isLiveLocation ? 'LIVE GPS ATMOSPHERIC STREAM' : 'LOCATION MESH FEED')}
        </span>
      </div>

      <div className="telemetry-meta">
        <span className="meta-item meta-device">
          <span className="meta-icon">{isConnected ? '⚡' : '🛰️'}</span>
          <span>{isConnected ? `Station: ${deviceName}` : 'Satellite Grid Mesh'}</span>
        </span>
        <span className="meta-sep">•</span>
        <span className="meta-item meta-transport">
          <span className="meta-icon">🔄</span>
          <span>{isConnected ? 'Socket.IO Full-Duplex' : 'HTTP/2 Edge CDN'}</span>
        </span>
        <span className="meta-sep">•</span>
        <span className="meta-item meta-time">
          <span className="meta-icon">⏱️</span>
          <span>Packet: <strong>{getTimeString()}</strong></span>
        </span>
      </div>
    </div>
  );
}
