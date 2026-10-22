import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

/**
 * Sidebar3DCanvas.jsx
 * 
 * Lightweight, hardware-accelerated 3D atmospheric background canvas for the AirGuard sidebar.
 * Renders vertical particulate flow, floating IoT beacon rings, and theme-adaptive atmospheric hues.
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
    camera.position.z = 85;

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: 'low-power',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);

    // 2. Theme-Specific Color Palette
    let primaryColor, secondaryColor, accentColor;
    if (isLight) {
      primaryColor = new THREE.Color(0x059669);   // Vivid Emerald
      secondaryColor = new THREE.Color(0x0284c7); // Royal Sapphire
      accentColor = new THREE.Color(0x7c3aed);    // Violet
    } else if (isNeon) {
      primaryColor = new THREE.Color(0x10b981);   // Electric Emerald
      secondaryColor = new THREE.Color(0xa855f7); // Electric Purple
      accentColor = new THREE.Color(0x06b6d4);    // Cyan
    } else if (isSlate) {
      primaryColor = new THREE.Color(0x38bdf8);   // Sky Cyan
      secondaryColor = new THREE.Color(0x94a3b8); // Metallic Slate
      accentColor = new THREE.Color(0x60a5fa);    // Soft Blue
    } else {
      // Obsidian / Dark
      primaryColor = new THREE.Color(0x38bdf8);   // Neon Sky
      secondaryColor = new THREE.Color(0x6366f1); // Indigo
      accentColor = new THREE.Color(0x00d2b4);    // Mint Teal
    }

    // 3. 3D Floating Orbital Sensor Rings
    const ringGroup = new THREE.Group();
    scene.add(ringGroup);

    const ringGeo1 = new THREE.TorusGeometry(14, 0.35, 12, 36);
    const ringMat1 = new THREE.MeshBasicMaterial({
      color: primaryColor,
      transparent: true,
      opacity: isLight ? 0.40 : 0.28,
      wireframe: true,
    });
    const ringMesh1 = new THREE.Mesh(ringGeo1, ringMat1);
    ringMesh1.position.set(0, 32, -10);
    ringMesh1.rotation.x = Math.PI / 3;
    ringGroup.add(ringMesh1);

    const ringGeo2 = new THREE.TorusGeometry(18, 0.3, 12, 36);
    const ringMat2 = new THREE.MeshBasicMaterial({
      color: secondaryColor,
      transparent: true,
      opacity: isLight ? 0.35 : 0.22,
      wireframe: true,
    });
    const ringMesh2 = new THREE.Mesh(ringGeo2, ringMat2);
    ringMesh2.position.set(2, -35, -15);
    ringMesh2.rotation.x = -Math.PI / 4;
    ringMesh2.rotation.y = Math.PI / 6;
    ringGroup.add(ringMesh2);

    // 4. Vertical Atmospheric Air Quality Particle Stream
    const particleCount = 70;
    const particleGeo = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);
    const particleColors = new Float32Array(particleCount * 3);
    const particleVels = [];

    // Particle Glow Texture
    const createParticleTexture = () => {
      const pCanvas = document.createElement('canvas');
      pCanvas.width = 32;
      pCanvas.height = 32;
      const ctx = pCanvas.getContext('2d');
      const grad = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
      grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
      grad.addColorStop(0.35, 'rgba(255, 255, 255, 0.8)');
      grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 32, 32);
      return new THREE.CanvasTexture(pCanvas);
    };

    for (let i = 0; i < particleCount; i++) {
      const idx = i * 3;
      particlePositions[idx] = (Math.random() - 0.5) * 44;     // x (-22 to 22)
      particlePositions[idx + 1] = (Math.random() - 0.5) * 110; // y (-55 to 55)
      particlePositions[idx + 2] = (Math.random() - 0.5) * 20;  // z (-10 to 10)

      particleVels.push({
        y: 0.12 + Math.random() * 0.18,
        swaySpeed: 0.8 + Math.random() * 1.2,
        swayAmp: 0.08 + Math.random() * 0.12,
        phase: Math.random() * Math.PI * 2,
      });

      const colorSeed = Math.random();
      const c = colorSeed > 0.55 ? primaryColor : colorSeed > 0.2 ? secondaryColor : accentColor;
      particleColors[idx] = c.r;
      particleColors[idx + 1] = c.g;
      particleColors[idx + 2] = c.b;
    }

    particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    particleGeo.setAttribute('color', new THREE.BufferAttribute(particleColors, 3));

    const particleMat = new THREE.PointsMaterial({
      size: isLight ? 3.6 : 2.8,
      vertexColors: true,
      map: createParticleTexture(),
      transparent: true,
      opacity: isLight ? 0.75 : 0.60,
      blending: isLight ? THREE.NormalBlending : THREE.AdditiveBlending,
      depthWrite: false,
    });

    const particles = new THREE.Points(particleGeo, particleMat);
    scene.add(particles);

    // 5. Connective Micro-Filament Lines between adjacent particles
    const lineCount = 20;
    const lineIndices = [];
    for (let i = 0; i < lineCount; i++) {
      lineIndices.push(i * 2, (i * 2 + 1) % particleCount);
    }
    const lineGeo = new THREE.BufferGeometry();
    lineGeo.setAttribute('position', particleGeo.getAttribute('position'));
    lineGeo.setIndex(lineIndices);

    const lineMat = new THREE.LineBasicMaterial({
      color: primaryColor,
      transparent: true,
      opacity: isLight ? 0.25 : 0.14,
    });
    const lineMesh = new THREE.LineSegments(lineGeo, lineMat);
    scene.add(lineMesh);

    // 6. Interactive Parallax over Sidebar
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

    // 7. Animation Loop
    let clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();

      // Gentle rotation of the orbital rings
      ringMesh1.rotation.z = elapsed * 0.25;
      ringMesh1.rotation.y = Math.sin(elapsed * 0.3) * 0.2;

      ringMesh2.rotation.z = -elapsed * 0.18;
      ringMesh2.rotation.x = Math.cos(elapsed * 0.25) * 0.3;

      // Parallax responsiveness
      ringGroup.position.x = mouseX * 4;
      ringGroup.position.y = -mouseY * 4;

      // Vertical ascending air stream animation
      const posArray = particleGeo.attributes.position.array;
      for (let i = 0; i < particleCount; i++) {
        const idx = i * 3;
        const vel = particleVels[i];

        // Rise up
        posArray[idx + 1] += vel.y;
        // Horizontal aerodynamic sway
        posArray[idx] += Math.sin(elapsed * vel.swaySpeed + vel.phase) * vel.swayAmp;

        // Loop boundary
        if (posArray[idx + 1] > 56) {
          posArray[idx + 1] = -56;
          posArray[idx] = (Math.random() - 0.5) * 44;
        }
      }
      particleGeo.attributes.position.needsUpdate = true;

      camera.position.x = mouseX * 2;
      camera.position.y = -mouseY * 2;
      camera.lookAt(0, 0, 0);

      renderer.render(scene, camera);
    };

    animate();

    // 8. Resize Observer for Sidebar
    const resizeObserver = new ResizeObserver(() => {
      if (!container) return;
      const w = container.clientWidth || 245;
      const h = container.clientHeight || window.innerHeight;
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

      ringGeo1.dispose();
      ringMat1.dispose();
      ringGeo2.dispose();
      ringMat2.dispose();
      particleGeo.dispose();
      particleMat.dispose();
      lineGeo.dispose();
      lineMat.dispose();
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
