import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

/**
 * ESP32Node3DViewer
 * Interactive 3D WebGL digital twin of the AirGuard ESP32 IoT Sensor Node.
 * Features:
 * - ESP-WROOM-32 board with metallic RF shield, pin headers, and Wi-Fi PCB antenna
 * - MQ-135 electrochemical sensor with steel mesh chamber and heating filament glow
 * - DHT22 temperature & humidity module with signature ventilation louvers
 * - Radiating 3D Wi-Fi broadcast wavefronts symbolizing sub-28ms telemetry packets
 * - Interactive mouse orbit controls, AQI state simulation, and pinout callout tags
 */
export default function ESP32Node3DViewer({ theme = 'obsidian', height = 340, aqiTier = 'good' }) {
  const mountRef = useRef(null);
  const [autoRotate, setAutoRotate] = useState(true);
  const [activePinout, setActivePinout] = useState('all');
  const [simAqi, setSimAqi] = useState(aqiTier); // 'good' | 'moderate' | 'unhealthy'
  const isLight = theme === 'light';

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    let width = container.clientWidth || 400;
    let containerHeight = height;

    // 1. Scene, Camera, Renderer
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / containerHeight, 0.1, 1000);
    camera.position.set(0, 38, 70);
    camera.lookAt(0, 2, 0);

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, containerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    // 2. Lighting
    const ambientLight = new THREE.AmbientLight(isLight ? 0xffffff : 0x88b0d8, isLight ? 1.6 : 1.1);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, isLight ? 2.0 : 1.8);
    dirLight.position.set(30, 60, 40);
    dirLight.castShadow = true;
    scene.add(dirLight);

    const fillLight = new THREE.DirectionalLight(isLight ? 0x0284c7 : 0x38bdf8, isLight ? 1.0 : 1.2);
    fillLight.position.set(-40, 20, -30);
    scene.add(fillLight);

    // Dynamic AQI Status LED Light
    const aqiLedColor = simAqi === 'good' ? 0x10b981 : simAqi === 'moderate' ? 0xf59e0b : 0xef4444;
    const aqiPointLight = new THREE.PointLight(aqiLedColor, 3, 30);
    aqiPointLight.position.set(10, 8, 12);
    scene.add(aqiPointLight);

    // MQ-135 Internal Heater Warm Glow
    const heaterLight = new THREE.PointLight(0xff7700, 2.5, 18);
    heaterLight.position.set(-14, 10, 6);
    scene.add(heaterLight);

    // 3. Root Node Assembly Group
    const nodeGroup = new THREE.Group();
    scene.add(nodeGroup);

    // ── A. ESP32 Main PCB Board ──
    const pcbGeo = new THREE.BoxGeometry(40, 2.2, 64);
    const pcbMat = new THREE.MeshStandardMaterial({
      color: isLight ? 0x0f2942 : 0x0a192f,
      roughness: 0.4,
      metalness: 0.2,
    });
    const pcbMesh = new THREE.Mesh(pcbGeo, pcbMat);
    pcbMesh.receiveShadow = true;
    pcbMesh.castShadow = true;
    nodeGroup.add(pcbMesh);

    // PCB Gold Corner Mounting Rings
    const mountHoleGeo = new THREE.CylinderGeometry(1.6, 1.6, 2.4, 16);
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, roughness: 0.3, metalness: 0.85 });
    const holePositions = [
      [-17, 0, -28], [17, 0, -28],
      [-17, 0, 28], [17, 0, 28]
    ];
    holePositions.forEach(([hx, hy, hz]) => {
      const ring = new THREE.Mesh(mountHoleGeo, goldMat);
      ring.position.set(hx, hy, hz);
      nodeGroup.add(ring);
    });

    // ── B. ESP-WROOM-32 Metal RF Shield ──
    const rfShieldGeo = new THREE.BoxGeometry(22, 3.2, 24);
    const rfShieldMat = new THREE.MeshStandardMaterial({
      color: 0xc8d1dc,
      roughness: 0.25,
      metalness: 0.88,
    });
    const rfShield = new THREE.Mesh(rfShieldGeo, rfShieldMat);
    rfShield.position.set(0, 2.6, -10);
    rfShield.castShadow = true;
    nodeGroup.add(rfShield);

    // PCB Antenna Region (top gold/copper trace)
    const antennaGeo = new THREE.BoxGeometry(18, 0.4, 8);
    const antennaMat = new THREE.MeshStandardMaterial({ color: 0xcd7f32, roughness: 0.3, metalness: 0.8 });
    const antenna = new THREE.Mesh(antennaGeo, antennaMat);
    antenna.position.set(0, 1.4, -26);
    nodeGroup.add(antenna);

    // ── C. Micro-USB / USB-C Port ──
    const usbGeo = new THREE.BoxGeometry(9, 3.5, 7);
    const usbMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.2, metalness: 0.9 });
    const usbPort = new THREE.Mesh(usbGeo, usbMat);
    usbPort.position.set(0, 2.5, 32);
    nodeGroup.add(usbPort);

    // ── D. Pin Headers (Left & Right Rows: 15 pins each) ──
    const pinHeaderGeo = new THREE.BoxGeometry(2.5, 4.5, 54);
    const pinHeaderMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.8 });
    const leftHeader = new THREE.Mesh(pinHeaderGeo, pinHeaderMat);
    leftHeader.position.set(-18, 3.2, 0);
    nodeGroup.add(leftHeader);

    const rightHeader = new THREE.Mesh(pinHeaderGeo, pinHeaderMat);
    rightHeader.position.set(18, 3.2, 0);
    nodeGroup.add(rightHeader);

    // Gold Pin Legs (30 pins)
    const pinLegGeo = new THREE.CylinderGeometry(0.4, 0.4, 6, 8);
    for (let p = 0; p < 15; p++) {
      const zPos = -24 + p * 3.4;
      const leftPin = new THREE.Mesh(pinLegGeo, goldMat);
      leftPin.position.set(-18, 6.2, zPos);
      nodeGroup.add(leftPin);

      const rightPin = new THREE.Mesh(pinLegGeo, goldMat);
      rightPin.position.set(18, 6.2, zPos);
      nodeGroup.add(rightPin);
    }

    // ── E. MQ-135 Gas Sensor Breakout Module ──
    const mqGroup = new THREE.Group();
    mqGroup.position.set(-14, 4, 12);
    nodeGroup.add(mqGroup);

    // MQ-135 Breakout Board (Blue PCB)
    const mqPcbGeo = new THREE.BoxGeometry(16, 1.6, 20);
    const mqPcbMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.4 });
    const mqPcb = new THREE.Mesh(mqPcbGeo, mqPcbMat);
    mqGroup.add(mqPcb);

    // MQ-135 Stainless Steel Mesh Cylinder
    const mqCylinderGeo = new THREE.CylinderGeometry(6.5, 6.5, 9, 24);
    const mqCylinderMat = new THREE.MeshStandardMaterial({
      color: 0xd1d5db,
      wireframe: false,
      roughness: 0.35,
      metalness: 0.85,
    });
    const mqCylinder = new THREE.Mesh(mqCylinderGeo, mqCylinderMat);
    mqCylinder.position.set(0, 5.2, 0);
    mqGroup.add(mqCylinder);

    // MQ-135 Mesh Grill Top
    const mqTopGeo = new THREE.CylinderGeometry(6.7, 6.7, 1.2, 24);
    const mqTopMat = new THREE.MeshStandardMaterial({ color: 0x9ca3af, roughness: 0.3, metalness: 0.9 });
    const mqTop = new THREE.Mesh(mqTopGeo, mqTopMat);
    mqTop.position.set(0, 9.8, 0);
    mqGroup.add(mqTop);

    // Internal Glow Filament inside MQ-135
    const heaterCoreGeo = new THREE.CylinderGeometry(2, 2, 6, 12);
    const heaterCoreMat = new THREE.MeshBasicMaterial({ color: 0xff6600 });
    const heaterCore = new THREE.Mesh(heaterCoreGeo, heaterCoreMat);
    heaterCore.position.set(0, 5.2, 0);
    mqGroup.add(heaterCore);

    // ── F. DHT22 Temperature & Humidity Sensor ──
    const dhtGroup = new THREE.Group();
    dhtGroup.position.set(12, 4, 12);
    nodeGroup.add(dhtGroup);

    // White ventilated casing
    const dhtCasingGeo = new THREE.BoxGeometry(13, 8.5, 17);
    const dhtCasingMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      roughness: 0.5,
      metalness: 0.05,
    });
    const dhtCasing = new THREE.Mesh(dhtCasingGeo, dhtCasingMat);
    dhtCasing.position.set(0, 4.2, 0);
    dhtGroup.add(dhtCasing);

    // DHT22 Grill Vent Slits (3 horizontal slits)
    const slitGeo = new THREE.BoxGeometry(9, 0.7, 0.4);
    const slitMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.8 });
    [-2, 0, 2].forEach((offsetY) => {
      const slit = new THREE.Mesh(slitGeo, slitMat);
      slit.position.set(0, 4.2 + offsetY * 1.8, 8.6);
      dhtGroup.add(slit);
    });

    // ── G. Status & Power LEDs ──
    const ledGeo = new THREE.BoxGeometry(1.4, 1.2, 1.8);
    const powerLedMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
    const powerLed = new THREE.Mesh(ledGeo, powerLedMat);
    powerLed.position.set(-6, 2.2, 24);
    nodeGroup.add(powerLed);

    const aqiLedMat = new THREE.MeshBasicMaterial({ color: aqiLedColor });
    const aqiLed = new THREE.Mesh(ledGeo, aqiLedMat);
    aqiLed.position.set(6, 2.2, 24);
    nodeGroup.add(aqiLed);

    // ── H. Radiating Wi-Fi Broadcast Wavefronts (Torus Rings) ──
    const waveCount = 3;
    const waveRings = [];
    for (let w = 0; w < waveCount; w++) {
      const ringGeo = new THREE.TorusGeometry(10 + w * 7, 0.45, 12, 36);
      const ringMat = new THREE.MeshBasicMaterial({
        color: isLight ? 0x0284c7 : 0x38bdf8,
        transparent: true,
        opacity: 0.6 - w * 0.18,
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = Math.PI / 2;
      ring.position.set(0, 4, -26);
      nodeGroup.add(ring);
      waveRings.push({ ring, baseRadius: 10 + w * 7, phase: (w / waveCount) * Math.PI * 2 });
    }

    // 4. Interactive Mouse Drag / Orbit Controls
    let isDragging = false;
    let prevMouseX = 0;
    let prevMouseY = 0;
    let rotationVelocityX = 0;
    let rotationVelocityY = 0;

    const onMouseDown = (e) => {
      isDragging = true;
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;
    };

    const onMouseMove = (e) => {
      if (!isDragging) return;
      const deltaX = e.clientX - prevMouseX;
      const deltaY = e.clientY - prevMouseY;
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;

      rotationVelocityY = deltaX * 0.008;
      rotationVelocityX = deltaY * 0.008;

      nodeGroup.rotation.y += rotationVelocityY;
      nodeGroup.rotation.x += rotationVelocityX;
    };

    const onMouseUp = () => {
      isDragging = false;
    };

    const canvasDom = renderer.domElement;
    canvasDom.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    // Touch support for mobile devices
    const onTouchStart = (e) => {
      if (e.touches.length === 1) {
        isDragging = true;
        prevMouseX = e.touches[0].clientX;
        prevMouseY = e.touches[0].clientY;
      }
    };
    const onTouchMove = (e) => {
      if (!isDragging || e.touches.length !== 1) return;
      const deltaX = e.touches[0].clientX - prevMouseX;
      const deltaY = e.touches[0].clientY - prevMouseY;
      prevMouseX = e.touches[0].clientX;
      prevMouseY = e.touches[0].clientY;

      nodeGroup.rotation.y += deltaX * 0.008;
      nodeGroup.rotation.x += deltaY * 0.008;
    };
    const onTouchEnd = () => {
      isDragging = false;
    };

    canvasDom.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('touchend', onTouchEnd);

    // 5. Animation Loop
    let animationFrameId;
    let clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();

      // Auto-rotation if enabled and not dragging
      if (autoRotate && !isDragging) {
        nodeGroup.rotation.y += 0.009;
        nodeGroup.rotation.x = Math.sin(elapsed * 0.6) * 0.08 + 0.15;
      }

      // Gentle floating bob
      nodeGroup.position.y = Math.sin(elapsed * 1.5) * 1.2;

      // Pulse Wi-Fi broadcast wave rings
      waveRings.forEach((wObj, idx) => {
        const scale = 1 + (Math.sin(elapsed * 2.5 + wObj.phase) + 1) * 0.35;
        wObj.ring.scale.set(scale, scale, scale);
        wObj.ring.material.opacity = Math.max(0, 0.65 - (scale - 1) * 0.9);
      });

      // Internal heater flicker
      heaterLight.intensity = 2.0 + Math.sin(elapsed * 4.0) * 0.6;

      renderer.render(scene, camera);
    };

    animate();

    // 6. Resize Handler
    const handleResize = () => {
      if (!container) return;
      const newW = container.clientWidth || 400;
      camera.aspect = newW / containerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(newW, containerHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
      window.removeEventListener('resize', handleResize);
      canvasDom.removeEventListener('mousedown', onMouseDown);
      canvasDom.removeEventListener('touchstart', onTouchStart);

      if (container && renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [theme, autoRotate, simAqi, height]);

  return (
    <div className="esp32-node-3d-container">
      {/* 3D Canvas Mounting Surface */}
      <div
        ref={mountRef}
        style={{
          width: '100%',
          height: `${height}px`,
          position: 'relative',
          cursor: 'grab',
          borderRadius: '16px',
          overflow: 'hidden',
        }}
        title="Click and drag to rotate the ESP32 Node in 3D"
      />

      {/* Floating 3D HUD Overlay Controls */}
      <div className="node-3d-hud-overlay">
        <div className="node-3d-header-badge">
          <span className="pulse-dot green" />
          <span className="mono fs-xs">ESP32-WROOM-32 PHYSICAL TWIN</span>
          <span className="node-3d-fps">● 60 FPS WebGL</span>
        </div>

        {/* Pinout Quick Highlights */}
        <div className="node-3d-pinout-tags">
          <span
            className={`pin-tag ${activePinout === 'mq135' ? 'is-active' : ''}`}
            onClick={() => setActivePinout(activePinout === 'mq135' ? 'all' : 'mq135')}
          >
            🔥 MQ-135 ➔ GPIO 34 (ADC1)
          </span>
          <span
            className={`pin-tag ${activePinout === 'dht22' ? 'is-active' : ''}`}
            onClick={() => setActivePinout(activePinout === 'dht22' ? 'all' : 'dht22')}
          >
            💧 DHT22 ➔ GPIO 4
          </span>
          <span
            className={`pin-tag ${activePinout === 'wifi' ? 'is-active' : ''}`}
            onClick={() => setActivePinout(activePinout === 'wifi' ? 'all' : 'wifi')}
          >
            📡 Wi-Fi ➔ 2.4GHz Mesh
          </span>
        </div>

        {/* Interactive Bottom Control Toolbar */}
        <div className="node-3d-controls-bar">
          <div className="node-3d-state-buttons">
            <span className="state-label">Simulate Air Quality:</span>
            <button
              type="button"
              className={`sim-btn good ${simAqi === 'good' ? 'is-selected' : ''}`}
              onClick={() => setSimAqi('good')}
            >
              Good
            </button>
            <button
              type="button"
              className={`sim-btn mod ${simAqi === 'moderate' ? 'is-selected' : ''}`}
              onClick={() => setSimAqi('moderate')}
            >
              Moderate
            </button>
            <button
              type="button"
              className={`sim-btn danger ${simAqi === 'unhealthy' ? 'is-selected' : ''}`}
              onClick={() => setSimAqi('unhealthy')}
            >
              Severe
            </button>
          </div>

          <button
            type="button"
            className="rotate-toggle-btn"
            onClick={() => setAutoRotate(!autoRotate)}
          >
            {autoRotate ? '⏸ Pause Spin' : '▶ Spin 3D'}
          </button>
        </div>
      </div>
    </div>
  );
}
