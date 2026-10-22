import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

/**
 * Sidebar3DCanvas.jsx
 * 
 * Soft Atmospheric Aurora Glow & Floating Clean-Air Micro-Orbs.
 * Designed specifically for AirGuard:
 * - Fluid, breathing multi-tone auroral ambient gradients
 * - Softly floating, luminous atmospheric micro-particles
 * - Subtle cursor-responsive light refraction
 * - 100% clean legibility: zero harsh rings, lines, or visual clutter
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
    camera.position.z = 80;

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);

    // 2. Texture Generator for Silky Aurora Glow Orbs
    const createAuroraTexture = (r, g, b, innerAlpha = 0.85, midAlpha = 0.35) => {
      const gCanvas = document.createElement('canvas');
      gCanvas.width = 256;
      gCanvas.height = 256;
      const ctx = gCanvas.getContext('2d');
      const grad = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
      grad.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${innerAlpha})`);
      grad.addColorStop(0.35, `rgba(${r}, ${g}, ${b}, ${midAlpha})`);
      grad.addColorStop(0.7, `rgba(${r}, ${g}, ${b}, ${midAlpha * 0.3})`);
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 256, 256);
      return new THREE.CanvasTexture(gCanvas);
    };

    // 3. Texture Generator for Luminous Atmospheric Micro-Orbs
    const createMicroOrbTexture = () => {
      const pCanvas = document.createElement('canvas');
      pCanvas.width = 64;
      pCanvas.height = 64;
      const ctx = pCanvas.getContext('2d');
      const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
      grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
      grad.addColorStop(0.2, 'rgba(255, 255, 255, 0.8)');
      grad.addColorStop(0.5, 'rgba(125, 211, 252, 0.35)');
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 64, 64);
      return new THREE.CanvasTexture(pCanvas);
    };

    // 4. Color Palettes by Theme
    let colors;
    if (isLight) {
      colors = [
        { r: 5, g: 150, b: 105, scale: [55, 75], yBase: 25, xBase: -6 },   // Emerald
        { r: 2, g: 132, b: 199, scale: [60, 80], yBase: -20, xBase: 8 },   // Sky Blue
        { r: 124, g: 58, b: 237, scale: [50, 70], yBase: 2, xBase: -2 },   // Violet
      ];
    } else if (isNeon) {
      colors = [
        { r: 16, g: 185, b: 129, scale: [58, 80], yBase: 28, xBase: -8 },  // Cyber Green
        { r: 168, g: 85, b: 247, scale: [65, 88], yBase: -22, xBase: 6 },  // Purple
        { r: 6, g: 182, b: 212, scale: [52, 72], yBase: 4, xBase: 0 },    // Cyan
      ];
    } else if (isSlate) {
      colors = [
        { r: 56, g: 189, b: 248, scale: [55, 75], yBase: 24, xBase: -6 },  // Sky
        { r: 96, g: 165, b: 250, scale: [62, 85], yBase: -22, xBase: 8 },  // Blue
        { r: 148, g: 163, b: 184, scale: [50, 68], yBase: 2, xBase: -2 }, // Slate
      ];
    } else {
      // Obsidian / Dark
      colors = [
        { r: 56, g: 189, b: 248, scale: [58, 82], yBase: 26, xBase: -8 },  // Electric Cyan
        { r: 0, g: 210, b: 180, scale: [65, 90], yBase: -22, xBase: 7 },   // Teal Emerald
        { r: 99, g: 102, b: 241, scale: [54, 76], yBase: 2, xBase: -3 },   // Indigo
      ];
    }

    // 5. Build Breathing Aurora Orbs (Volumetric ambient layers)
    const auroraGroup = new THREE.Group();
    scene.add(auroraGroup);

    const textures = [];
    const auroraSprites = colors.map((c, i) => {
      const tex = createAuroraTexture(
        c.r,
        c.g,
        c.b,
        isLight ? 0.32 : 0.45,
        isLight ? 0.16 : 0.22
      );
      textures.push(tex);

      const mat = new THREE.SpriteMaterial({
        map: tex,
        transparent: true,
        opacity: isLight ? 0.40 : 0.50,
        blending: isLight ? THREE.NormalBlending : THREE.AdditiveBlending,
        depthWrite: false,
      });

      const sprite = new THREE.Sprite(mat);
      sprite.scale.set(c.scale[0], c.scale[1], 1);
      sprite.position.set(c.xBase, c.yBase, -20 - i * 6);
      auroraGroup.add(sprite);

      return {
        sprite,
        mat,
        config: c,
        speedX: 0.35 + i * 0.18,
        speedY: 0.28 + i * 0.14,
        scaleSpeed: 0.4 + i * 0.15,
        phase: i * 2.1,
      };
    });

    // 6. Build Floating Luminous Atmospheric Micro-Orbs
    const microOrbTex = createMicroOrbTexture();
    textures.push(microOrbTex);

    const particleCount = 28;
    const particleGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const particleColors = new Float32Array(particleCount * 3);
    const particleData = [];

    for (let i = 0; i < particleCount; i++) {
      const x = (Math.random() - 0.5) * 36;
      const y = (Math.random() - 0.5) * 110;
      const z = -10 - Math.random() * 25;

      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;

      // Pick gentle complementary colors
      const colChoice = colors[i % colors.length];
      const rNorm = colChoice.r / 255;
      const gNorm = colChoice.g / 255;
      const bNorm = colChoice.b / 255;

      particleColors[i * 3] = rNorm;
      particleColors[i * 3 + 1] = gNorm;
      particleColors[i * 3 + 2] = bNorm;

      particleData.push({
        origX: x,
        y: y,
        speedY: 0.08 + Math.random() * 0.14,
        driftSpeedX: 0.4 + Math.random() * 0.6,
        driftAmpX: 1.5 + Math.random() * 2.5,
        phase: Math.random() * Math.PI * 2,
      });
    }

    particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particleGeo.setAttribute('color', new THREE.BufferAttribute(particleColors, 3));

    const particleMat = new THREE.PointsMaterial({
      size: isLight ? 2.6 : 2.2,
      map: microOrbTex,
      vertexColors: true,
      transparent: true,
      opacity: isLight ? 0.45 : 0.55,
      blending: isLight ? THREE.NormalBlending : THREE.AdditiveBlending,
      depthWrite: false,
    });

    const particles = new THREE.Points(particleGeo, particleMat);
    scene.add(particles);

    // 7. Interactive Cursor Parallax
    let mouseX = 0;
    let mouseY = 0;
    let targetX = 0;
    let targetY = 0;

    const handleMouseMove = (e) => {
      const rect = container.getBoundingClientRect();
      if (
        e.clientX >= rect.left &&
        e.clientX <= rect.right &&
        e.clientY >= rect.top &&
        e.clientY <= rect.bottom
      ) {
        targetX = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
        targetY = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
      }
    };
    window.addEventListener('mousemove', handleMouseMove, { passive: true });

    // 8. Animation Loop
    let clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();

      // Smooth mouse lerp
      mouseX += (targetX - mouseX) * 0.04;
      mouseY += (targetY - mouseY) * 0.04;

      // Animate breathing Aurora Orbs
      auroraSprites.forEach((item) => {
        const { sprite, config, speedX, speedY, scaleSpeed, phase } = item;

        // Fluid undulating position drift
        const dx = Math.sin(elapsed * speedX + phase) * 7 + mouseX * 4;
        const dy = Math.cos(elapsed * speedY + phase * 1.3) * 8 - mouseY * 4;
        sprite.position.x = config.xBase + dx;
        sprite.position.y = config.yBase + dy;

        // Gentle breathing pulsation
        const scaleFactor = 1 + Math.sin(elapsed * scaleSpeed + phase) * 0.12;
        sprite.scale.set(
          config.scale[0] * scaleFactor,
          config.scale[1] * scaleFactor,
          1
        );
      });

      // Animate Floating Atmospheric Clean-Air Micro-Orbs
      const posArray = particleGeo.attributes.position.array;
      for (let i = 0; i < particleCount; i++) {
        const p = particleData[i];
        p.y += p.speedY;

        // Reset if float out of top bound
        if (p.y > 60) {
          p.y = -60;
        }

        const waveX = Math.sin(elapsed * p.driftSpeedX + p.phase) * p.driftAmpX + mouseX * 3;
        posArray[i * 3] = p.origX + waveX;
        posArray[i * 3 + 1] = p.y;
      }
      particleGeo.attributes.position.needsUpdate = true;

      // Gentle camera parallax tilt
      camera.position.x = mouseX * 2.0;
      camera.position.y = -mouseY * 2.0;
      camera.lookAt(0, 0, -20);

      renderer.render(scene, camera);
    };

    animate();

    // 9. Resize Observer
    const resizeObserver = new ResizeObserver(() => {
      if (!container) return;
      const w = container.clientWidth || 245;
      const h = container.clientHeight || window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    });
    resizeObserver.observe(container);

    // 10. Clean up resources
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('mousemove', handleMouseMove);
      resizeObserver.disconnect();

      if (container && renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }

      textures.forEach((tex) => tex.dispose());
      auroraSprites.forEach(({ mat }) => mat.dispose());
      particleGeo.dispose();
      particleMat.dispose();
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
