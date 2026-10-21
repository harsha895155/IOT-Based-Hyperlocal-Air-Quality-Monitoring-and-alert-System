import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

/**
 * AirAmbient3DCanvas
 * Dashboard & In-App Page-Specific 3D Ambient Atmospheric Background.
 * Unlike the Welcome Page (which features the global IoT mesh sphere),
 * this canvas provides calm, non-intrusive, slide-specific 3D atmospheric flow:
 * - /dashboard: Gentle horizontal aerosol streamlines & breeze particulate flow
 * - /devices: IoT sensor node constellation with signal packet vectors
 * - /analytics: Holographic 3D data waveform spectrum
 * - /alerts: Concentric sentinel sonar pulse rings
 * - other: Calm isobaric atmospheric drift
 */
export default function AirAmbient3DCanvas({ theme = 'obsidian', routePath = '/dashboard' }) {
  const mountRef = useRef(null);
  const isLight = theme === 'light';

  // Derive active animation mode from current URL slide/route
  const getPageMode = (path) => {
    if (path.startsWith('/devices')) return 'devices';
    if (path.startsWith('/analytics') || path.startsWith('/history')) return 'analytics';
    if (path.startsWith('/alerts')) return 'alerts';
    return 'dashboard'; // Default for /dashboard, /locations, /reports, etc.
  };

  const pageMode = getPageMode(routePath);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    let width = window.innerWidth;
    let height = window.innerHeight;

    // 1. Scene, Camera, Renderer
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(55, width / height, 0.1, 1000);
    camera.position.set(0, 0, 90);

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x000000, 0); // Transparent to blend into CSS background
    container.appendChild(renderer.domElement);

    // 2. Color Palette for Particles & Atmospheric Geometry (Vibrant Cyberpunk Daylight)
    const emerald = new THREE.Color(0x10b981); // Bright Electric Emerald Green
    const violet = new THREE.Color(0x8b5cf6);  // Radiant Cyberpunk Purple / Violet
    const cyan = new THREE.Color(0x06b6d4);    // Luminous Aqua Cyan
    const amber = new THREE.Color(0xf59e0b);   // Solar Amber

    // Pure radial glow texture for sharp, vivid, colorful particles
    const createGlowTexture = () => {
      const pCanvas = document.createElement('canvas');
      pCanvas.width = 64;
      pCanvas.height = 64;
      const ctx = pCanvas.getContext('2d');
      const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
      gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
      gradient.addColorStop(0.35, isLight ? 'rgba(255, 255, 255, 0.98)' : 'rgba(255, 255, 255, 0.85)');
      gradient.addColorStop(0.7, isLight ? 'rgba(240, 240, 255, 0.5)' : 'rgba(255, 255, 255, 0.25)');
      gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 64, 64);
      return new THREE.CanvasTexture(pCanvas);
    };
    const glowMap = createGlowTexture();

    // ─── Floating Volumetric Colored Light Blooms (Emerald & Purple Ambient Atmosphere) ───
    const orbGroup = new THREE.Group();
    scene.add(orbGroup);

    const orb1Mat = new THREE.MeshBasicMaterial({
      color: 0x10b981,
      transparent: true,
      opacity: isLight ? 0.22 : 0.12,
    });
    const orb1 = new THREE.Mesh(new THREE.SphereGeometry(38, 20, 20), orb1Mat);
    orb1.position.set(-60, 32, -35);
    orbGroup.add(orb1);

    const orb2Mat = new THREE.MeshBasicMaterial({
      color: 0x8b5cf6,
      transparent: true,
      opacity: isLight ? 0.24 : 0.14,
    });
    const orb2 = new THREE.Mesh(new THREE.SphereGeometry(44, 20, 20), orb2Mat);
    orb2.position.set(72, -26, -40);
    orbGroup.add(orb2);

    // 3. Root scene group for active page mode
    const modeGroup = new THREE.Group();
    scene.add(modeGroup);

    // ─── A. DASHBOARD MODE: Atmospheric Aerosol Streamlines & Gentle Breeze ───
    let dashboardParticles = null;
    let streamRibbons = [];

    if (pageMode === 'dashboard') {
      const pCount = isLight ? 480 : 500;
      const pGeo = new THREE.BufferGeometry();
      const pPos = new Float32Array(pCount * 3);
      const pCol = new Float32Array(pCount * 3);
      const pSpeeds = new Float32Array(pCount);

      for (let i = 0; i < pCount; i++) {
        const idx = i * 3;
        pPos[idx] = (Math.random() - 0.5) * 230; // X spread
        pPos[idx + 1] = (Math.random() - 0.5) * 140; // Y spread
        pPos[idx + 2] = (Math.random() - 0.5) * 60; // Z spread

        pSpeeds[i] = 0.09 + Math.random() * 0.16; // Horizontal wind drift speed

        // Colorful distribution: 45% Emerald Green, 45% Radiant Purple, 10% Aqua Cyan
        const rand = Math.random();
        const col = rand > 0.55 ? emerald : rand > 0.1 ? violet : cyan;
        pCol[idx] = col.r;
        pCol[idx + 1] = col.g;
        pCol[idx + 2] = col.b;
      }

      pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
      pGeo.setAttribute('color', new THREE.BufferAttribute(pCol, 3));

      const pMat = new THREE.PointsMaterial({
        size: isLight ? 4.8 : 2.8,
        vertexColors: true,
        map: glowMap,
        transparent: true,
        opacity: isLight ? 0.78 : 0.55,
        blending: THREE.NormalBlending,
        depthWrite: false,
      });

      dashboardParticles = new THREE.Points(pGeo, pMat);
      dashboardParticles.userData = { speeds: pSpeeds };
      modeGroup.add(dashboardParticles);

      // Smooth horizontal aerodynamic wind curves (Emerald, Purple, Cyan)
      for (let r = 0; r < 3; r++) {
        const points = [];
        const yBase = -35 + r * 35;
        for (let x = -115; x <= 115; x += 10) {
          const y = yBase + Math.sin(x * 0.04 + r) * 9;
          points.push(new THREE.Vector3(x, y, -10 + r * 5));
        }
        const curve = new THREE.CatmullRomCurve3(points);
        const tubeGeo = new THREE.TubeGeometry(curve, 54, isLight ? 0.8 : 0.45, 8, false);
        const tubeMat = new THREE.MeshBasicMaterial({
          color: r === 0 ? emerald : r === 1 ? violet : cyan,
          transparent: true,
          opacity: isLight ? 0.38 : 0.18,
        });
        const ribbon = new THREE.Mesh(tubeGeo, tubeMat);
        modeGroup.add(ribbon);
        streamRibbons.push({ ribbon, basePoints: points, r });
      }
    }

    // ─── B. DEVICES MODE: IoT Sensor Node Constellation ───
    let deviceBeacons = [];
    if (pageMode === 'devices') {
      const beaconCount = 20;
      const beaconGeo = new THREE.SphereGeometry(1.4, 14, 14);
      const ringGeo = new THREE.RingGeometry(1.8, 3.2, 22);

      const nodePoints = [];

      for (let i = 0; i < beaconCount; i++) {
        const bx = (Math.random() - 0.5) * 165;
        const by = (Math.random() - 0.5) * 95;
        const bz = (Math.random() - 0.5) * 30;

        const isGreen = i % 2 === 0;
        const bMat = new THREE.MeshBasicMaterial({
          color: isGreen ? emerald : violet,
          transparent: true,
          opacity: isLight ? 0.85 : 0.7,
        });
        const beacon = new THREE.Mesh(beaconGeo, bMat);
        beacon.position.set(bx, by, bz);
        modeGroup.add(beacon);

        const rMat = new THREE.MeshBasicMaterial({
          color: isGreen ? emerald : violet,
          transparent: true,
          opacity: isLight ? 0.6 : 0.5,
          side: THREE.DoubleSide,
        });
        const ring = new THREE.Mesh(ringGeo, rMat);
        ring.position.set(bx, by, bz);
        modeGroup.add(ring);

        nodePoints.push(new THREE.Vector3(bx, by, bz));
        deviceBeacons.push({ beacon, ring, phase: Math.random() * Math.PI * 2 });
      }

      // Connecting network telemetry vector lines in emerald & purple
      const lineCoords = [];
      for (let i = 0; i < beaconCount; i++) {
        for (let j = i + 1; j < beaconCount; j++) {
          if (nodePoints[i].distanceTo(nodePoints[j]) < 48) {
            lineCoords.push(
              nodePoints[i].x, nodePoints[i].y, nodePoints[i].z,
              nodePoints[j].x, nodePoints[j].y, nodePoints[j].z
            );
          }
        }
      }
      const lineGeo = new THREE.BufferGeometry();
      lineGeo.setAttribute('position', new THREE.Float32BufferAttribute(lineCoords, 3));
      const lineMat = new THREE.LineBasicMaterial({
        color: isLight ? 0x10b981 : 0x38bdf8,
        transparent: true,
        opacity: isLight ? 0.34 : 0.18,
      });
      const lines = new THREE.LineSegments(lineGeo, lineMat);
      modeGroup.add(lines);
    }

    // ─── C. ANALYTICS MODE: Holographic 3D Data Terrain Waves ───
    let wavePlane = null;
    if (pageMode === 'analytics') {
      const planeGeo = new THREE.PlaneGeometry(185, 115, 34, 26);
      const planeMat = new THREE.MeshBasicMaterial({
        color: isLight ? 0x8b5cf6 : 0x38bdf8,
        wireframe: true,
        transparent: true,
        opacity: isLight ? 0.32 : 0.14,
      });
      wavePlane = new THREE.Mesh(planeGeo, planeMat);
      wavePlane.rotation.x = -Math.PI / 3;
      wavePlane.position.y = -20;
      modeGroup.add(wavePlane);
    }

    // ─── D. ALERTS MODE: Concentric Sentinel Sonar Rings ───
    let sonarRings = [];
    if (pageMode === 'alerts') {
      for (let s = 0; s < 4; s++) {
        const sGeo = new THREE.RingGeometry(10 + s * 18, 11.5 + s * 18, 48);
        const ringCol = s % 2 === 0 ? emerald : violet;
        const sMat = new THREE.MeshBasicMaterial({
          color: s === 0 ? amber : ringCol,
          transparent: true,
          opacity: isLight ? 0.42 - s * 0.06 : 0.25 - s * 0.05,
          side: THREE.DoubleSide,
        });
        const sMesh = new THREE.Mesh(sGeo, sMat);
        sMesh.position.set(0, 0, -10);
        modeGroup.add(sMesh);
        sonarRings.push({ sMesh, baseR: 10 + s * 18, phase: (s / 4) * Math.PI * 2 });
      }
    }

    // 4. Parallax Mouse Response
    let mouseX = 0;
    let mouseY = 0;
    let targetX = 0;
    let targetY = 0;

    const onMouseMove = (e) => {
      targetX = (e.clientX - width / 2) * 0.015;
      targetY = (e.clientY - height / 2) * 0.015;
    };
    window.addEventListener('mousemove', onMouseMove, { passive: true });

    // 5. Animation Loop
    let animationFrameId;
    let clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();

      // Smooth camera tilt
      mouseX += (targetX - mouseX) * 0.04;
      mouseY += (targetY - mouseY) * 0.04;
      camera.position.x = mouseX;
      camera.position.y = -mouseY;

      // ── Animate Ambient Aurora Orbs (Emerald & Purple) ──
      orb1.position.x = -60 + Math.sin(elapsed * 0.3) * 22;
      orb1.position.y = 32 + Math.cos(elapsed * 0.25) * 16;
      orb2.position.x = 72 + Math.cos(elapsed * 0.28) * 24;
      orb2.position.y = -26 + Math.sin(elapsed * 0.32) * 18;

      // ── Animate Dashboard Particles ──
      if (dashboardParticles) {
        const positions = dashboardParticles.geometry.attributes.position.array;
        const speeds = dashboardParticles.userData.speeds;
        for (let i = 0; i < speeds.length; i++) {
          const idx = i * 3;
          positions[idx] += speeds[i]; // Float horizontally (wind flow)
          positions[idx + 1] += Math.sin(elapsed * 0.8 + i) * 0.035; // Gentle wave

          if (positions[idx] > 115) {
            positions[idx] = -115;
          }
        }
        dashboardParticles.geometry.attributes.position.needsUpdate = true;
      }

      // ── Animate Stream Ribbons ──
      streamRibbons.forEach(({ ribbon, r }) => {
        ribbon.position.y = Math.sin(elapsed * 0.6 + r * 1.4) * 2;
        ribbon.rotation.z = Math.sin(elapsed * 0.2 + r) * 0.04;
      });

      // ── Animate Device Beacons ──
      deviceBeacons.forEach(({ ring, phase }) => {
        const pulse = (Math.sin(elapsed * 2.5 + phase) + 1) / 2;
        ring.scale.set(1 + pulse * 0.8, 1 + pulse * 0.8, 1);
        ring.material.opacity = Math.max(0, (isLight ? 0.6 : 0.4) - pulse * 0.35);
      });

      // ── Animate Analytics Wave Plane ──
      if (wavePlane) {
        const pos = wavePlane.geometry.attributes.position;
        for (let i = 0; i < pos.count; i++) {
          const u = pos.getX(i);
          const v = pos.getY(i);
          pos.setZ(i, Math.sin(u * 0.06 + elapsed * 1.2) * 4.5 + Math.cos(v * 0.08 + elapsed * 0.9) * 3.5);
        }
        pos.needsUpdate = true;
      }

      // ── Animate Sonar Rings ──
      sonarRings.forEach(({ sMesh, phase }) => {
        const pulse = (Math.sin(elapsed * 1.5 + phase) + 1) / 2;
        sMesh.scale.set(1 + pulse * 0.4, 1 + pulse * 0.4, 1);
        sMesh.material.opacity = Math.max(0, (isLight ? 0.45 : 0.28) - pulse * 0.25);
      });

      renderer.render(scene, camera);
    };

    animate();

    // 6. Resize Handler
    const onResize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('resize', onResize);

      if (container && renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
      glowMap.dispose();
    };
  }, [theme, pageMode, isLight]);

  return (
    <div
      ref={mountRef}
      className="air-ambient-3d-canvas-wrap"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        pointerEvents: 'none',
        zIndex: 0,
        overflow: 'hidden',
      }}
    />
  );
}
