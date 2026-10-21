import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

export default function AirGuard3DCanvas({ particleMode = 'atmospheric', theme = 'obsidian' }) {
  const mountRef = useRef(null);
  const [webglSupported, setWebglSupported] = useState(true);

  const isLight = theme === 'light';

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // Check WebGL availability
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (!gl) {
        setWebglSupported(false);
        return;
      }
    } catch (e) {
      setWebglSupported(false);
      return;
    }

    let animationFrameId;
    let width = container.clientWidth || window.innerWidth;
    let height = container.clientHeight || window.innerHeight;

    // 1. Scene, Camera, Renderer
    const scene = new THREE.Scene();
    // Only apply fog in dark mode; keep light mode crystal clear and crisp
    if (!isLight) {
      scene.fog = new THREE.FogExp2(0x060913, 0.0016);
    }

    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
    camera.position.z = 120;
    camera.position.y = 15;

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x000000, 0); // Transparent to blend with page theme
    container.appendChild(renderer.domElement);

    // 2. Lighting
    const ambientLight = new THREE.AmbientLight(isLight ? 0x0284c7 : 0x38bdf8, isLight ? 2.0 : 0.7);
    scene.add(ambientLight);

    const pointLight = new THREE.PointLight(isLight ? 0x0284c7 : 0x00d2b4, isLight ? 3.5 : 2.5, 300);
    pointLight.position.set(50, 50, 80);
    scene.add(pointLight);

    const secondaryLight = new THREE.PointLight(isLight ? 0x4f46e5 : 0x818cf8, 2.5, 250);
    secondaryLight.position.set(-60, -30, 60);
    scene.add(secondaryLight);

    // 3. 3D Globe / Atmosphere Mesh
    const globeGroup = new THREE.Group();
    scene.add(globeGroup);

    // Inner wireframe sphere
    const globeRadius = 45;
    const globeGeometry = new THREE.IcosahedronGeometry(globeRadius, 4);
    const globeWireMaterial = new THREE.MeshBasicMaterial({
      color: isLight ? 0x0284c7 : 0x0ea5e9,
      wireframe: true,
      transparent: true,
      opacity: isLight ? 0.45 : 0.14,
    });
    const globeMesh = new THREE.Mesh(globeGeometry, globeWireMaterial);
    globeGroup.add(globeMesh);

    // Outer atmospheric halo shell
    const haloGeometry = new THREE.SphereGeometry(globeRadius * 1.08, 32, 32);
    const haloMaterial = new THREE.MeshBasicMaterial({
      color: isLight ? 0x059669 : 0x00d2b4,
      wireframe: true,
      transparent: true,
      opacity: isLight ? 0.28 : 0.06,
    });
    const haloMesh = new THREE.Mesh(haloGeometry, haloMaterial);
    globeGroup.add(haloMesh);

    // 4. IoT Sensor Beacons on the Globe
    const beaconCount = 32;
    const beaconPoints = [];
    const beaconRings = [];
    const beaconGroup = new THREE.Group();
    globeGroup.add(beaconGroup);

    const beaconGeo = new THREE.SphereGeometry(1.4, 12, 12);
    const beaconMat = new THREE.MeshBasicMaterial({ color: isLight ? 0x0284c7 : 0x38bdf8 });
    const alertBeaconMat = new THREE.MeshBasicMaterial({ color: isLight ? 0xd97706 : 0xf59e0b });

    for (let i = 0; i < beaconCount; i++) {
      // Golden spiral distribution on sphere surface
      const phi = Math.acos(-1 + (2 * i) / beaconCount);
      const theta = Math.sqrt(beaconCount * Math.PI) * phi;
      const x = globeRadius * Math.cos(theta) * Math.sin(phi);
      const y = globeRadius * Math.sin(theta) * Math.sin(phi);
      const z = globeRadius * Math.cos(phi);

      const beacon = new THREE.Mesh(beaconGeo, i % 6 === 0 ? alertBeaconMat : beaconMat);
      beacon.position.set(x, y, z);
      beaconGroup.add(beacon);
      beaconPoints.push(new THREE.Vector3(x, y, z));

      // Pulsing wave ring around beacon
      const ringGeo = new THREE.RingGeometry(1.5, 2.6, 16);
      const ringMat = new THREE.MeshBasicMaterial({
        color: i % 6 === 0 ? (isLight ? 0xd97706 : 0xf59e0b) : (isLight ? 0x0284c7 : 0x00d2b4),
        transparent: true,
        opacity: isLight ? 0.88 : 0.75,
        side: THREE.DoubleSide,
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.position.set(x, y, z);
      ring.lookAt(x * 2, y * 2, z * 2);
      beaconGroup.add(ring);
      beaconRings.push({ ring, initialScale: 1.0, phase: Math.random() * Math.PI * 2 });
    }

    // 5. Mesh Interconnect Lines between closest IoT Beacons
    const lineCoords = [];
    for (let i = 0; i < beaconCount; i++) {
      for (let j = i + 1; j < beaconCount; j++) {
        const dist = beaconPoints[i].distanceTo(beaconPoints[j]);
        if (dist < 30) {
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
      opacity: isLight ? 0.55 : 0.25,
    });
    const networkLines = new THREE.LineSegments(lineGeo, lineMat);
    beaconGroup.add(networkLines);

    // 6. 3D Atmospheric Air Quality Particles (Jewel-toned for high contrast in Light mode)
    const particleCount = 1800;
    const particleGeo = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);
    const particleColors = new Float32Array(particleCount * 3);
    const particleSpeeds = new Float32Array(particleCount * 3);

    const cyan = isLight ? new THREE.Color(0x0284c7) : new THREE.Color(0x38bdf8); // Sapphire
    const emerald = isLight ? new THREE.Color(0x059669) : new THREE.Color(0x00d2b4); // Vivid Emerald
    const violet = isLight ? new THREE.Color(0x4f46e5) : new THREE.Color(0x818cf8); // Royal Indigo
    const amber = isLight ? new THREE.Color(0xd97706) : new THREE.Color(0xf59e0b); // Sunset Amber
    const rose = isLight ? new THREE.Color(0xe11d48) : new THREE.Color(0xf43f5e); // Crimson

    for (let i = 0; i < particleCount; i++) {
      const idx = i * 3;
      const r = 40 + Math.random() * 130;
      const th = Math.random() * Math.PI * 2;
      const ph = (Math.random() - 0.5) * Math.PI;

      particlePositions[idx] = r * Math.cos(th) * Math.cos(ph);
      particlePositions[idx + 1] = r * Math.sin(ph) * 0.75 + (Math.random() - 0.5) * 45;
      particlePositions[idx + 2] = r * Math.sin(th) * Math.cos(ph);

      particleSpeeds[idx] = (Math.random() - 0.5) * 0.18;
      particleSpeeds[idx + 1] = (Math.random() - 0.5) * 0.14;
      particleSpeeds[idx + 2] = (Math.random() - 0.5) * 0.18;

      const randColor = Math.random();
      const col =
        randColor > 0.65 ? emerald :
        randColor > 0.35 ? cyan :
        randColor > 0.15 ? violet :
        randColor > 0.05 ? amber : rose;

      particleColors[idx] = col.r;
      particleColors[idx + 1] = col.g;
      particleColors[idx + 2] = col.b;
    }

    particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    particleGeo.setAttribute('color', new THREE.BufferAttribute(particleColors, 3));

    // Pure White Radial Glow Texture so vertexColors shine with 100% saturation and radiance
    const createParticleTexture = () => {
      const pCanvas = document.createElement('canvas');
      pCanvas.width = 64;
      pCanvas.height = 64;
      const ctx = pCanvas.getContext('2d');
      const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
      gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
      gradient.addColorStop(0.25, 'rgba(255, 255, 255, 0.95)');
      gradient.addColorStop(0.65, 'rgba(255, 255, 255, 0.4)');
      gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 64, 64);
      return new THREE.CanvasTexture(pCanvas);
    };

    const particleMaterial = new THREE.PointsMaterial({
      size: isLight ? 4.2 : 3.0,
      vertexColors: true,
      map: createParticleTexture(),
      transparent: true,
      opacity: isLight ? 0.95 : 0.82,
      blending: isLight ? THREE.NormalBlending : THREE.AdditiveBlending,
      depthWrite: false,
    });

    const particleSystem = new THREE.Points(particleGeo, particleMaterial);
    scene.add(particleSystem);

    // 7. Interactive Mouse Tracking & Parallax
    let targetMouseX = 0;
    let targetMouseY = 0;
    let currentMouseX = 0;
    let currentMouseY = 0;

    const handleMouseMove = (e) => {
      const halfW = window.innerWidth / 2;
      const halfH = window.innerHeight / 2;
      targetMouseX = (e.clientX - halfW) / halfW;
      targetMouseY = (e.clientY - halfH) / halfH;
    };

    let scrollProgress = 0;
    const handleScroll = () => {
      const scrollMax = document.documentElement.scrollHeight - window.innerHeight || 1;
      scrollProgress = window.scrollY / scrollMax;
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('scroll', handleScroll, { passive: true });

    // 8. Animation Loop
    let clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      const elapsedTime = clock.getElapsedTime();

      // Smooth mouse lerp
      currentMouseX += (targetMouseX - currentMouseX) * 0.05;
      currentMouseY += (targetMouseY - currentMouseY) * 0.05;

      // Rotate Globe & Beacons
      globeGroup.rotation.y = elapsedTime * 0.08 + currentMouseX * 0.35;
      globeGroup.rotation.x = Math.sin(elapsedTime * 0.05) * 0.15 - currentMouseY * 0.25;
      globeGroup.position.y = -8 + Math.sin(elapsedTime * 0.5) * 2 - scrollProgress * 25;
      globeGroup.position.z = -scrollProgress * 40;

      // Animate pulsing beacon wave rings
      beaconRings.forEach(({ ring, phase }) => {
        const pulse = (Math.sin(elapsedTime * 3 + phase) + 1) / 2;
        ring.scale.set(1 + pulse * 1.5, 1 + pulse * 1.5, 1);
        ring.material.opacity = Math.max(0, (isLight ? 0.9 : 0.8) - pulse * 0.7);
      });

      // Flowing atmospheric particles simulation
      const positions = particleGeo.attributes.position.array;
      for (let i = 0; i < particleCount; i++) {
        const idx = i * 3;
        positions[idx] += particleSpeeds[idx];
        positions[idx + 1] += particleSpeeds[idx + 1] + Math.sin(elapsedTime * 0.5 + i) * 0.02;
        positions[idx + 2] += particleSpeeds[idx + 2];

        // Atmospheric boundary wrapping
        if (positions[idx] > 160) positions[idx] = -160;
        if (positions[idx] < -160) positions[idx] = 160;
        if (positions[idx + 1] > 120) positions[idx + 1] = -120;
        if (positions[idx + 1] < -120) positions[idx + 1] = 120;
        if (positions[idx + 2] > 140) positions[idx + 2] = -140;
        if (positions[idx + 2] < -140) positions[idx + 2] = 140;
      }
      particleGeo.attributes.position.needsUpdate = true;

      // Slowly swirl the particle galaxy
      particleSystem.rotation.y = elapsedTime * 0.03;
      particleSystem.rotation.x = Math.cos(elapsedTime * 0.02) * 0.05;

      // Camera parallax response
      camera.position.x = currentMouseX * 14;
      camera.position.y = 15 - currentMouseY * 10 - scrollProgress * 15;
      camera.lookAt(0, -scrollProgress * 20, 0);

      renderer.render(scene, camera);
    };

    animate();

    // 9. Resize Handling
    const handleResize = () => {
      if (!container) return;
      width = container.clientWidth || window.innerWidth;
      height = container.clientHeight || window.innerHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    };

    window.addEventListener('resize', handleResize);

    // 10. Clean up resources on unmount
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);

      if (container && renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }

      globeGeometry.dispose();
      globeWireMaterial.dispose();
      haloGeometry.dispose();
      haloMaterial.dispose();
      beaconGeo.dispose();
      beaconMat.dispose();
      alertBeaconMat.dispose();
      lineGeo.dispose();
      lineMat.dispose();
      particleGeo.dispose();
      particleMaterial.dispose();
      renderer.dispose();
    };
  }, [particleMode, isLight]);

  return (
    <div
      ref={mountRef}
      className="airguard-3d-canvas-wrap"
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
    >
      {!webglSupported && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: isLight
              ? 'radial-gradient(ellipse at 50% 30%, rgba(2, 132, 199, 0.15) 0%, rgba(248, 250, 252, 0) 70%)'
              : 'radial-gradient(ellipse at 50% 30%, rgba(56, 189, 248, 0.12) 0%, rgba(10, 15, 29, 0) 70%)',
          }}
        />
      )}
    </div>
  );
}
