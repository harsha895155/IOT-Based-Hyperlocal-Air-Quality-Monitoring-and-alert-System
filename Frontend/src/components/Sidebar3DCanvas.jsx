import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

/**
 * Sidebar3DCanvas.jsx
 * 
 * Non-intrusive, hardware-accelerated 3D atmospheric background canvas for the AirGuard sidebar.
 * Renders a subtle, soft vertical particle current without dominating or obstructing navigation text.
 */
export default function Sidebar3DCanvas({ theme = 'obsidian' }) {
  const mountRef = useRef(null);
  const [webglSupported, setWebglSupported] = useState(true);

  const isLight = theme === 'light';
  const isNeon = theme === 'neon';
  const isSlate = theme === 'slate';

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
    let width = container.clientWidth || 245;
    let height = container.clientHeight || window.innerHeight;

    // 1. Scene, Camera, Renderer
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000);
    camera.position.z = 90;

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: 'low-power',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);

    // 2. Theme-Specific Subtle Palette
    let primaryColor, secondaryColor, accentColor;
    if (isLight) {
      primaryColor = new THREE.Color(0x059669);   // Emerald
      secondaryColor = new THREE.Color(0x0284c7); // Sapphire
      accentColor = new THREE.Color(0x7c3aed);    // Violet
    } else if (isNeon) {
      primaryColor = new THREE.Color(0x10b981);   // Cyber Emerald
      secondaryColor = new THREE.Color(0xa855f7); // Violet
      accentColor = new THREE.Color(0x06b6d4);    // Cyan
    } else if (isSlate) {
      primaryColor = new THREE.Color(0x38bdf8);   // Soft Sky
      secondaryColor = new THREE.Color(0x94a3b8); // Slate
      accentColor = new THREE.Color(0x60a5fa);    // Soft Blue
    } else {
      // Obsidian / Dark
      primaryColor = new THREE.Color(0x38bdf8);   // Cyan
      secondaryColor = new THREE.Color(0x818cf8); // Indigo
      accentColor = new THREE.Color(0x34d399);    // Mint
    }

    // 3. Delicate Vertical Atmospheric Air Quality Particles (Subtle & Non-Dominating)
    const particleCount = 38;
    const particleGeo = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);
    const particleColors = new Float32Array(particleCount * 3);
    const particleVels = [];

    // Particle Texture with ultra-soft radial falloff
    const createParticleTexture = () => {
      const pCanvas = document.createElement('canvas');
      pCanvas.width = 32;
      pCanvas.height = 32;
      const ctx = pCanvas.getContext('2d');
      const grad = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
      grad.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
      grad.addColorStop(0.35, 'rgba(255, 255, 255, 0.4)');
      grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 32, 32);
      return new THREE.CanvasTexture(pCanvas);
    };

    for (let i = 0; i < particleCount; i++) {
      const idx = i * 3;
      particlePositions[idx] = (Math.random() - 0.5) * 40;     // x
      particlePositions[idx + 1] = (Math.random() - 0.5) * 110; // y
      particlePositions[idx + 2] = -20 - Math.random() * 25;   // z: pushed deeper into background

      particleVels.push({
        y: 0.08 + Math.random() * 0.12,
        swaySpeed: 0.6 + Math.random() * 0.8,
        swayAmp: 0.04 + Math.random() * 0.06,
        phase: Math.random() * Math.PI * 2,
      });

      const colorSeed = Math.random();
      const c = colorSeed > 0.6 ? primaryColor : colorSeed > 0.3 ? secondaryColor : accentColor;
      particleColors[idx] = c.r;
      particleColors[idx + 1] = c.g;
      particleColors[idx + 2] = c.b;
    }

    particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    particleGeo.setAttribute('color', new THREE.BufferAttribute(particleColors, 3));

    const pTex = createParticleTexture();
    const particleMat = new THREE.PointsMaterial({
      size: isLight ? 2.6 : 2.0,
      vertexColors: true,
      map: pTex,
      transparent: true,
      opacity: isLight ? 0.40 : 0.28, // Soft, non-dominating opacity
      blending: isLight ? THREE.NormalBlending : THREE.AdditiveBlending,
      depthWrite: false,
    });

    const particles = new THREE.Points(particleGeo, particleMat);
    scene.add(particles);

    // 4. Subtle Parallax on Mouse Movement
    let mouseX = 0;
    let mouseY = 0;
    const handleMouseMove = (e) => {
      const rect = container.getBoundingClientRect();
      if (
        e.clientX >= rect.left &&
        e.clientX <= rect.right &&
        e.clientY >= rect.top &&
        e.clientY <= rect.bottom
      ) {
        mouseX = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
        mouseY = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
      }
    };
    window.addEventListener('mousemove', handleMouseMove, { passive: true });

    // 5. Animation Loop
    let clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();

      // Vertical ascending air stream animation
      const posArray = particleGeo.attributes.position.array;
      for (let i = 0; i < particleCount; i++) {
        const idx = i * 3;
        const vel = particleVels[i];

        posArray[idx + 1] += vel.y;
        posArray[idx] += Math.sin(elapsed * vel.swaySpeed + vel.phase) * vel.swayAmp;

        if (posArray[idx + 1] > 56) {
          posArray[idx + 1] = -56;
          posArray[idx] = (Math.random() - 0.5) * 40;
        }
      }
      particleGeo.attributes.position.needsUpdate = true;

      camera.position.x = mouseX * 1.5;
      camera.position.y = -mouseY * 1.5;
      camera.lookAt(0, 0, -25);

      renderer.render(scene, camera);
    };

    animate();

    // 6. Resize Observer for Sidebar
    const resizeObserver = new ResizeObserver(() => {
      if (!container) return;
      const w = container.clientWidth || 245;
      const h = container.clientHeight || window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    });
    resizeObserver.observe(container);

    // 7. Cleanup
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('mousemove', handleMouseMove);
      resizeObserver.disconnect();

      if (container && renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }

      particleGeo.dispose();
      particleMat.dispose();
      pTex.dispose();
      renderer.dispose();
    };
  }, [theme, isLight, isNeon, isSlate]);

  return (
    <div
      ref={mountRef}
      className="sidebar-3d-bg"
      aria-hidden="true"
    />
  );
}
