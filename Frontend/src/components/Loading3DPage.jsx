import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { useTheme } from '../context/ThemeContext';
import './Loading3DPage.css';

/**
 * Loading3DPage — High-Aesthetic 3D Atmospheric Loading Experience
 * 
 * Dynamically adapts to the website theme:
 * - Light Theme: Crystalline daylight atmosphere, emerald & cyan particle orbits, bright glass card.
 * - Dark Theme: Deep space obsidian atmosphere, neon laser rings, holographic cyber glow.
 */
export default function Loading3DPage({
  onLoaded = null,
  minDuration = 1800,
  fullScreen = true,
}) {
  const mountRef = useRef(null);
  const { resolvedTheme } = useTheme() || {};
  const isLight = resolvedTheme === 'light';

  const [isFadingOut, setIsFadingOut] = useState(false);

  // Smooth timing to allow full 3D animation before graceful fade-out
  useEffect(() => {
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      if (elapsed >= minDuration) {
        clearInterval(interval);
        setIsFadingOut(true);
        setTimeout(() => {
          if (onLoaded) onLoaded();
        }, 450);
      }
    }, 50);

    return () => clearInterval(interval);
  }, [minDuration, onLoaded]);

  // Three.js 3D Atmospheric Particle Scene
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    let width = container.clientWidth || window.innerWidth;
    let height = container.clientHeight || window.innerHeight;

    // 1. Scene, Camera, Renderer
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000);
    camera.position.set(0, 0, 75);

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x000000, 0);
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // 2. Dynamic Theme Colors
    const primaryColor = isLight ? 0x0284c7 : 0x06b6d4;  // Bright Sky / Electric Cyan
    const secondaryColor = isLight ? 0x059669 : 0x10b981; // Emerald
    const tertiaryColor = isLight ? 0x7c3aed : 0xa855f7;  // Violet / Purple
    const coreColor = isLight ? 0x0284c7 : 0x38bdf8;

    // 3. Central Wireframe Icosahedron (The IoT Sensor Core)
    const coreGeo = new THREE.IcosahedronGeometry(11, 1);
    const coreMat = new THREE.MeshBasicMaterial({
      color: coreColor,
      wireframe: true,
      transparent: true,
      opacity: isLight ? 0.45 : 0.65,
    });
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    scene.add(coreMesh);

    // Inner glowing sphere
    const innerGeo = new THREE.SphereGeometry(7.5, 24, 24);
    const innerMat = new THREE.MeshBasicMaterial({
      color: isLight ? 0x38bdf8 : 0x0891b2,
      transparent: true,
      opacity: isLight ? 0.22 : 0.35,
    });
    const innerSphere = new THREE.Mesh(innerGeo, innerMat);
    scene.add(innerSphere);

    // 4. Concentric Gimbal Orbital Rings (Sensor Antennas)
    const createRing = (radius, tube, color, rotX, rotY) => {
      const ringGeo = new THREE.TorusGeometry(radius, tube, 12, 64);
      const ringMat = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: isLight ? 0.55 : 0.75,
      });
      const ringMesh = new THREE.Mesh(ringGeo, ringMat);
      ringMesh.rotation.x = rotX;
      ringMesh.rotation.y = rotY;
      scene.add(ringMesh);
      return ringMesh;
    };

    const ring1 = createRing(17, 0.22, primaryColor, Math.PI / 3, 0);
    const ring2 = createRing(21, 0.18, secondaryColor, -Math.PI / 4, Math.PI / 6);
    const ring3 = createRing(25, 0.15, tertiaryColor, Math.PI / 6, -Math.PI / 4);

    // 5. Swirling Atmospheric Particulate Cloud (1,000 Particles)
    const particleCount = 1000;
    const posArray = new Float32Array(particleCount * 3);
    const colArray = new Float32Array(particleCount * 3);
    const particleSpeeds = new Float32Array(particleCount);
    const particleRadii = new Float32Array(particleCount);
    const particleAngles = new Float32Array(particleCount);
    const particleHeights = new Float32Array(particleCount);

    const c1 = new THREE.Color(primaryColor);
    const c2 = new THREE.Color(secondaryColor);
    const c3 = new THREE.Color(tertiaryColor);

    for (let i = 0; i < particleCount; i++) {
      const radius = 14 + Math.random() * 32;
      const angle = Math.random() * Math.PI * 2;
      const heightVal = (Math.random() - 0.5) * 28;
      const speed = (0.008 + Math.random() * 0.016) * (Math.random() > 0.5 ? 1 : -1);

      particleRadii[i] = radius;
      particleAngles[i] = angle;
      particleHeights[i] = heightVal;
      particleSpeeds[i] = speed;

      posArray[i * 3] = Math.cos(angle) * radius;
      posArray[i * 3 + 1] = heightVal;
      posArray[i * 3 + 2] = Math.sin(angle) * radius;

      // Color distribution
      const colorChoice = Math.random();
      const chosenColor = colorChoice < 0.45 ? c1 : colorChoice < 0.8 ? c2 : c3;
      colArray[i * 3] = chosenColor.r;
      colArray[i * 3 + 1] = chosenColor.g;
      colArray[i * 3 + 2] = chosenColor.b;
    }

    const particleGeo = new THREE.BufferGeometry();
    particleGeo.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
    particleGeo.setAttribute('color', new THREE.BufferAttribute(colArray, 3));

    // Particle texture generator for sharp glowing points
    const createParticleTexture = () => {
      const pCanvas = document.createElement('canvas');
      pCanvas.width = 64;
      pCanvas.height = 64;
      const ctx = pCanvas.getContext('2d');
      const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
      grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
      grad.addColorStop(0.3, 'rgba(255, 255, 255, 0.85)');
      grad.addColorStop(0.65, 'rgba(255, 255, 255, 0.25)');
      grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 64, 64);
      return new THREE.CanvasTexture(pCanvas);
    };

    const particleMat = new THREE.PointsMaterial({
      size: isLight ? 2.4 : 2.8,
      vertexColors: true,
      map: createParticleTexture(),
      transparent: true,
      opacity: isLight ? 0.75 : 0.88,
      blending: isLight ? THREE.NormalBlending : THREE.AdditiveBlending,
      depthWrite: false,
    });

    const particleSystem = new THREE.Points(particleGeo, particleMat);
    scene.add(particleSystem);

    // 6. Animation Loop
    let animationFrameId;
    let clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();

      // Rotate central core
      coreMesh.rotation.x = elapsedTime * 0.35;
      coreMesh.rotation.y = elapsedTime * 0.45;

      // Pulsing inner sphere
      const pulseScale = 1 + Math.sin(elapsedTime * 3) * 0.08;
      innerSphere.scale.set(pulseScale, pulseScale, pulseScale);

      // Rotate orbital gimbal rings
      ring1.rotation.z = elapsedTime * 0.55;
      ring1.rotation.x = Math.PI / 3 + Math.sin(elapsedTime * 0.8) * 0.15;

      ring2.rotation.z = -elapsedTime * 0.45;
      ring2.rotation.y = Math.PI / 6 + Math.cos(elapsedTime * 0.7) * 0.2;

      ring3.rotation.z = elapsedTime * 0.35;
      ring3.rotation.x = Math.PI / 6 + Math.sin(elapsedTime * 0.5) * 0.25;

      // Swirl particles around core
      const positions = particleGeo.attributes.position.array;
      for (let i = 0; i < particleCount; i++) {
        particleAngles[i] += particleSpeeds[i];
        positions[i * 3] = Math.cos(particleAngles[i]) * particleRadii[i];
        positions[i * 3 + 1] = particleHeights[i] + Math.sin(elapsedTime * 1.5 + i) * 1.5;
        positions[i * 3 + 2] = Math.sin(particleAngles[i]) * particleRadii[i];
      }
      particleGeo.attributes.position.needsUpdate = true;

      // Gentle camera sway
      camera.position.x = Math.sin(elapsedTime * 0.4) * 3;
      camera.position.y = Math.cos(elapsedTime * 0.3) * 2;
      camera.lookAt(0, 0, 0);

      renderer.render(scene, camera);
    };

    animate();

    // Resize Handler
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
      if (container && renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
      coreGeo.dispose();
      coreMat.dispose();
      innerGeo.dispose();
      innerMat.dispose();
      particleGeo.dispose();
      particleMat.dispose();
    };
  }, [isLight]);

  return (
    <div
      className={`loading-3d-wrapper ${fullScreen ? 'is-fullscreen' : 'is-inline'} ${
        isLight ? 'theme-light' : 'theme-dark'
      } ${isFadingOut ? 'fade-out' : ''}`}
      role="status"
      aria-live="polite"
    >
      {/* 3D Atmospheric Canvas Mounting Container */}
      <div className="loading-3d-canvas-container" ref={mountRef} />

      {/* Ambient Radial Vignette & Glow */}
      <div className="loading-3d-glow-vignette" />
    </div>
  );
}
