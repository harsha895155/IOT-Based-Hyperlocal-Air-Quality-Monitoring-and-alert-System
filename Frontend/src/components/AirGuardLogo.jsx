import React from 'react';

export default function AirGuardLogo({ size = 26 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ borderRadius: '50%', flexShrink: 0 }}
      aria-hidden="true"
    >
      <defs>
        <radialGradient id="airguard-sphere" cx="35%" cy="35%" r="70%" fx="30%" fy="30%">
          <stop offset="0%" stopColor="#4ade80" />
          <stop offset="28%" stopColor="#38bdf8" />
          <stop offset="60%" stopColor="#f59e0b" />
          <stop offset="85%" stopColor="#ef4444" />
          <stop offset="100%" stopColor="#8b5cf6" />
        </radialGradient>
      </defs>
      <circle cx="16" cy="16" r="16" fill="url(#airguard-sphere)" />
    </svg>
  );
}
