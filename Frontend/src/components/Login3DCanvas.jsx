import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

/**
 * Login3DCanvas.jsx
 * 
 * Interactive 3D WebGL atmospheric environmental canvas for the AirGuard Authentication Portal.
 * Renders a glowing rotating IoT sensor sphere, orbiting telemetry beacons, and an atmospheric particle cloud.
 */
export default function Login3DCanvas({ theme = 'obsidian' }) {
  const mountRef = useRef(null);
  const [webglSupported, setWebglSupported] = useState(true);

  const isLight = theme === 'light';

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    try {
      const testCanvas = document.createElement('canvas');
      const gl = testCanvas.getContext('webgl') || testCanvas.getContext('experimental-webgl');
      if (!gl) {
        setWebglSupported(false);
        return;
      }
    } catch (e) {
      setWebglSupported(false);
      return;
    }

    let animationFrameId;
    let width = container.clientWidth || 500;
    let height = container.clientHeight || 700;

    // 1. Scene, Camera, Renderer
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(55, width / height, 0.1, 1000);
    camera.position.z = 110;
    camera.position.y = 8;

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);

    // 2. Ambient & Point Lighting
    const ambientLight = new THREE.AmbientLight(isLight ? 0x0284c7 : 0x38bdf8, isLight ? 1.8 : 0.8);
    scene.add(ambientLight);

    const pointLight1 = new THREE.PointLight(isLight ? 0x059669 : 0x00d2b4, isLight ? 3.0 : 2.2, 200);
    pointLight1.position.set(40, 40, 60);
    scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight(isLight ? 0x7c3aed : 0x818cf8, 2.0, 180);
    pointLight2.position.set(-40, -30, 40);
    scene.add(pointLight2);

    // 3. Central 3D Atmospheric IoT Globe
    const globeGroup = new THREE.Group();
    scene.add(globeGroup);

    const globeRadius = 38;
    const globeGeo = new THREE.IcosahedronGeometry(globeRadius, 3);
    const globeMat = new THREE.MeshBasicMaterial({
      color: isLight ? 0x0284c7 : 0x0ea5e9,
      wireframe: true,
      transparent: true,
      opacity: isLight ? 0.35 : 0.15,
    });
    const globeMesh = new THREE.Mesh(globeGeo, globeMat);
    globeGroup.add(globeMesh);

    // Outer Halo Shell
    const haloGeo = new THREE.SphereGeometry(globeRadius * 1.12, 28, 28);
    const haloMat = new THREE.MeshBasicMaterial({
      color: isLight ? 0x059669 : 0x00d2b4,
      wireframe: true,
      transparent: true,
      opacity: isLight ? 0.20 : 0.06,
    });
    const haloMesh = new THREE.Mesh(haloGeo, haloMat);
    globeGroup.add(haloMesh);

    // 4. IoT Sensor Beacons with Pulsing Signal Rings
    const beaconCount = 20;
    const beaconPoints = [];
    const beaconRings = [];
    const beaconGroup = new THREE.Group();
    globeGroup.add(beaconGroup);

    const beaconGeo = new THREE.SphereGeometry(1.2, 10, 10);
    const beaconMat = new THREE.MeshBasicMaterial({ color: isLight ? 0x0284c7 : 0x38bdf8 });
    const alertBeaconMat = new THREE.MeshBasicMaterial({ color: isLight ? 0xd97706 : 0xf59e0b });

    for (let i = 0; i < beaconCount; i++) {
      const phi = Math.acos(-1 + (2 * i) / beaconCount);
      const theta = Math.sqrt(beaconCount * Math.PI) * phi;
      const x = globeRadius * Math.cos(theta) * Math.sin(phi);
      const y = globeRadius * Math.sin(theta) * Math.sin(phi);
      const z = globeRadius * Math.cos(phi);

      const isAlert = i % 5 === 0;
      const beacon = new THREE.Mesh(beaconGeo, isAlert ? alertBeaconMat : beaconMat);
      beacon.position.set(x, y, z);
      beaconGroup.add(beacon);
      beaconPoints.push(new THREE.Vector3(x, y, z));

      // Signal ring
      const ringGeo = new THREE.RingGeometry(1.2, 2.2, 14);
      const ringMat = new THREE.MeshBasicMaterial({
        color: isAlert ? (isLight ? 0xd97706 : 0xf59e0b) : (isLight ? 0x0284c7 : 0x00d2b4),
        transparent: true,
        opacity: isLight ? 0.6 : 0.45,
        side: THREE.DoubleSide,
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.position.set(x, y, z);
      ring.lookAt(x * 2, y * 2, z * 2);
      beaconGroup.add(ring);
      beaconRings.push({ ring, phase: Math.random() * Math.PI * 2 });
    }

    // Connective Lines between nearby nodes
    const lineCoords = [];
    for (let i = 0; i < beaconCount; i++) {
      for (let j = i + 1; j < beaconCount; j++) {
        if (beaconPoints[i].distanceTo(beaconPoints[j]) < 28) {
          lineCoords.push(
            beaconPoints[i].x, beaconPoints[i].y, beaconPoints[i].z,
            beaconPoints[j].x, beaconPoints[j].y, beaconPoints[j].z
          );
        }
      }
    }
    const lineGeo = new THREE.BufferGeometry();
    lineGeo.setAttribute('position', new THREE.Float32BufferAttribute(lineCoords, 3));
    const lineMat = new THREE.LineBasicMaterial({
      color: isLight ? 0x0284c7 : 0x38bdf8,
      transparent: true,
      opacity: isLight ? 0.35 : 0.18,
    });
    const networkLines = new THREE.LineSegments(lineGeo, lineMat);
    beaconGroup.add(networkLines);

    // 5. Ambient Atmospheric Dust / Air Quality Particles
    const particleCount = 400;
    const particleGeo = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);
    const particleColors = new Float32Array(particleCount * 3);
    const particleSpeeds = new Float32Array(particleCount * 3);

    const c1 = isLight ? new THREE.Color(0x0284c7) : new THREE.Color(0x38bdf8);
    const c2 = isLight ? new THREE.Color(0x059669) : new THREE.Color(0x00d2b4);
    const c3 = isLight ? new THREE.Color(0x7c3aed) : new THREE.Color(0xa855f7);

    for (let i = 0; i < particleCount; i++) {
      const idx = i * 3;
      const r = 35 + Math.random() * 80;
      const th = Math.random() * Math.PI * 2;
      const ph = (Math.random() - 0.5) * Math.PI;

      particlePositions[idx] = r * Math.cos(th) * Math.cos(ph);
      particlePositions[idx + 1] = r * Math.sin(ph) * 0.8;
      particlePositions[idx + 2] = r * Math.sin(th) * Math.cos(ph);

      particleSpeeds[idx] = (Math.random() - 0.5) * 0.12;
      particleSpeeds[idx + 1] = (Math.random() - 0.5) * 0.10;
      particleSpeeds[idx + 2] = (Math.random() - 0.5) * 0.12;

      const seed = Math.random();
      const col = seed > 0.55 ? c1 : seed > 0.25 ? c2 : c3;
      particleColors[idx] = col.r;
      particleColors[idx + 1] = col.g;
      particleColors[idx + 2] = col.b;
    }

    particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    particleGeo.setAttribute('color', new THREE.BufferAttribute(particleColors, 3));

    // Particle texture
    const pCanvas = document.createElement('canvas');
    pCanvas.width = 32;
    pCanvas.height = 32;
    const pCtx = pCanvas.getContext('2d');
    const pGrad = pCtx.createRadialGradient(16, 16, 0, 16, 16, 16);
    pGrad.addColorStop(0, 'rgba(255, 255, 255, 1)');
    pGrad.addColorStop(0.3, 'rgba(255, 255, 255, 0.85)');
    pGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
    pCtx.fillStyle = pGrad;
    pCtx.fillRect(0, 0, 32, 32);
    const pTex = new THREE.CanvasTexture(pCanvas);

    const particleMat = new THREE.PointsMaterial({
      size: isLight ? 3.4 : 2.5,
      vertexColors: true,
      map: pTex,
      transparent: true,
      opacity: isLight ? 0.85 : 0.65,
      blending: isLight ? THREE.NormalBlending : THREE.AdditiveBlending,
      depthWrite: false,
    });
    const particles = new THREE.Points(particleGeo, particleMat);
    scene.add(particles);

    // 6. Interactive Mouse Tracking
    let mouseX = 0;
    let mouseY = 0;
    let targetX = 0;
    let targetY = 0;

    const handleMouseMove = (e) => {
      const halfW = window.innerWidth / 2;
      const halfH = window.innerHeight / 2;
      targetX = (e.clientX - halfW) / halfW;
      targetY = (e.clientY - halfH) / halfH;
    };
    window.addEventListener('mousemove', handleMouseMove, { passive: true });

    // 7. Animation Loop
    let clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();

      mouseX += (targetX - mouseX) * 0.05;
      mouseY += (targetY - mouseY) * 0.05;

      // Smooth rotation of globe
      globeGroup.rotation.y = elapsed * 0.08 + mouseX * 0.4;
      globeGroup.rotation.x = Math.sin(elapsed * 0.06) * 0.15 - mouseY * 0.3;
      globeGroup.position.y = Math.sin(elapsed * 0.4) * 2;

      // Pulse beacon rings
      beaconRings.forEach(({ ring, phase }) => {
        const pulse = (Math.sin(elapsed * 2.8 + phase) + 1) / 2;
        ring.scale.set(1 + pulse * 1.3, 1 + pulse * 1.3, 1);
        ring.material.opacity = Math.max(0, (isLight ? 0.6 : 0.45) - pulse * 0.4);
      });

      // Drift particles
      const pos = particleGeo.attributes.position.array;
      for (let i = 0; i < particleCount; i++) {
        const idx = i * 3;
        pos[idx] += particleSpeeds[idx];
        pos[idx + 1] += particleSpeeds[idx + 1];
        pos[idx + 2] += particleSpeeds[idx + 2];

        if (pos[idx] > 90) pos[idx] = -90;
        if (pos[idx] < -90) pos[idx] = 90;
        if (pos[idx + 1] > 80) pos[idx + 1] = -80;
        if (pos[idx + 1] < -80) pos[idx + 1] = 80;
        if (pos[idx + 2] > 90) pos[idx + 2] = -90;
        if (pos[idx + 2] < -90) pos[idx + 2] = 90;
      }
      particleGeo.attributes.position.needsUpdate = true;
      particles.rotation.y = elapsed * 0.025;

      camera.position.x = mouseX * 8;
      camera.position.y = 8 - mouseY * 6;
      camera.lookAt(0, 0, 0);

      renderer.render(scene, camera);
    };

    animate();

    // 8. Resize Observer
    const resizeObserver = new ResizeObserver(() => {
      if (!container) return;
      const w = container.clientWidth || 500;
      const h = container.clientHeight || 700;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    });
    resizeObserver.observe(container);

    // 9. Cleanup
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('mousemove', handleMouseMove);
      resizeObserver.disconnect();

      if (container && renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }

      globeGeo.dispose();
      globeMat.dispose();
      haloGeo.dispose();
      haloMat.dispose();
      beaconGeo.dispose();
      beaconMat.dispose();
      alertBeaconMat.dispose();
      lineGeo.dispose();
      lineMat.dispose();
      particleGeo.dispose();
      particleMat.dispose();
      pTex.dispose();
      renderer.dispose();
    };
  }, [theme, isLight]);

  return (
    <div
      ref={mountRef}
      className="login-3d-canvas-wrap"
      aria-hidden="true"
    />
  );
}
