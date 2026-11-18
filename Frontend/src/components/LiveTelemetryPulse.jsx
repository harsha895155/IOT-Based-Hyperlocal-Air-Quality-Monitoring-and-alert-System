import React, { useState, useEffect } from 'react';
import './LiveTelemetryPulse.css';

export default function LiveTelemetryPulse({
  isConnected = false,
  deviceName = 'ESP32 Sensing Node',
  lastSeenTime = null,
  isLiveLocation = false,
  displayPlaceName = 'Current Location',
  gpsLocation = null,
}) {
  const [secondsAgo, setSecondsAgo] = useState(0);

  useEffect(() => {
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
      <div className="telemetry-row-primary">
        <div className="telemetry-badge">
          <span className="live-radar-dot">
            <span className="radar-ring" />
            <span className="radar-core" />
          </span>
          <span className="live-label">
            {isConnected ? 'LIVE REAL-TIME TELEMETRY' : (isLiveLocation ? 'LIVE GPS STREAM' : 'LOCATION MESH FEED')}
          </span>
        </div>

        <span className="meta-station">
          {isConnected ? `Station: ${deviceName}` : `Mesh: ${deviceName || 'Satellite Grid'}`}
        </span>
      </div>

      <div className="telemetry-row-sub">
        <span className="meta-loc">
          <span style={{ color: isLiveLocation ? '#10b981' : '#38bdf8', fontWeight: 600 }}>
            {isLiveLocation ? '📍 Live Place' : '📍 Location Mode'}
          </span>
          {gpsLocation && (
            <>
              <span className="meta-sep">•</span>
              <span>{gpsLocation}</span>
            </>
          )}
        </span>
        <span className="meta-sep">•</span>
        <span className="meta-time">
          Packet: <strong>{getTimeString()}</strong>
        </span>
      </div>
    </div>
  );
}
