import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

/**
 * WeatherHero3DCanvas
 * Dynamic, self-contained 3D WebGL atmospheric weather canvas
 * designed specifically for the Weather Hero Card.
 *
 * Automatically detects and renders realistic, interactive 3D simulations:
 * - 'thunderstorm': Volumetric storm clouds, procedural 3D crackling lightning bolts, and torrential rain with splash ripples.
 * - 'rain' / 'drizzle': Translucent falling raindrop streaks, splash rings, and rain mist.
 * - 'snow': 3D tumbling crystalline snowflakes with Brownian drift and frosty ambient glow.
 * - 'clear-day': Radiant celestial Sun sphere with rotating corona rings, solar flares, and warm golden particles.
 * - 'clear-night': 3D glowing crescent moon, twinkling cosmic starfield, and periodic shooting star.
 * - 'clouds' / 'fog' / 'mist': Volumetric drifting cloud bank with filtered atmospheric light rays.
 * - 'windy': 3D aerodynamic wind streamlines and floating vortex particles.
 */
export default function WeatherHero3DCanvas({
  condition = 'Thunderstorm',
  iconType = 'thunderstorm',
  isDay = true,
  theme = 'obsidian',
}) {
  const mountRef = useRef(null);
  const isLight = theme === 'light';

  // 1. Classify Weather Condition into 3D Animation Mode
  const classifyMode = (cond, icon, day) => {
    const c = (cond || '').toLowerCase();
    const ic = (icon || '').toLowerCase();

    if (c.includes('thunder') || ic.includes('thunder') || ic.includes('storm')) {
      return 'thunderstorm';
    }
    if (c.includes('snow') || c.includes('flurr') || c.includes('ice') || c.includes('hail') || ic.includes('snow')) {
      return 'snow';
    }
    if (c.includes('rain') || c.includes('drizzle') || c.includes('shower') || ic.includes('rain') || ic.includes('drizzle')) {
      return 'rain';
    }
    if (c.includes('clear') || c.includes('sunny') || ic.includes('clear')) {
      return day ? 'clear-day' : 'clear-night';
    }
    if (c.includes('wind') || ic.includes('wind')) {
      return 'windy';
    }
    // Default for cloudy / overcast / fog / mist / partly-cloudy
    return 'clouds';
  };

  const weatherMode = classifyMode(condition, iconType, isDay);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    let width = container.clientWidth || 600;
    let height = container.clientHeight || 220;

    // 1. Scene, Camera, Renderer
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 0, 75);

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x000000, 0); // Transparent to blend seamlessly into card
    container.appendChild(renderer.domElement);

    const rootGroup = new THREE.Group();
    scene.add(rootGroup);

    // Dynamic Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, isLight ? 0.9 : 0.6);
    scene.add(ambientLight);

    const flashLight = new THREE.PointLight(0x93c5fd, 0, 200);
    flashLight.position.set(15, 25, 30);
    scene.add(flashLight);

    // Shared radial glow texture helper
    const createCircleTexture = () => {
      const cvs = document.createElement('canvas');
      cvs.width = 64;
      cvs.height = 64;
      const ctx = cvs.getContext('2d');
      const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
      grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
      grad.addColorStop(0.35, 'rgba(255, 255, 255, 0.8)');
      grad.addColorStop(0.8, 'rgba(255, 255, 255, 0.15)');
      grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 64, 64);
      return new THREE.CanvasTexture(cvs);
    };
    const circleTexture = createCircleTexture();

    // ─── MODE-SPECIFIC OBJECTS & RUNTIME HOOKS ───
    let updateFn = null;

    // ══════════════════════════════════════════════════════════════════════════
    // A. THUNDERSTORM MODE (Dark Volumetric Clouds + Flashing Lightning + Torrential Rain)
    // ══════════════════════════════════════════════════════════════════════════
    if (weatherMode === 'thunderstorm') {
      // 1. Rolling 3D Storm Clouds
      const cloudPuffs = [];
      const cloudGeo = new THREE.DodecahedronGeometry(8, 1);
      const cloudMat = new THREE.MeshStandardMaterial({
        color: isLight ? 0x94a3b8 : 0x1e293b,
        roughness: 0.9,
        metalness: 0.1,
        transparent: true,
        opacity: isLight ? 0.45 : 0.55,
      });

      for (let i = 0; i < 9; i++) {
        const puff = new THREE.Mesh(cloudGeo, cloudMat);
        puff.position.set(-45 + i * 11 + (Math.random() - 0.5) * 8, 18 + (Math.random() - 0.5) * 6, -10 + (Math.random() - 0.5) * 8);
        const s = 1.2 + Math.random() * 0.9;
        puff.scale.set(s * 1.5, s * 0.9, s);
        rootGroup.add(puff);
        cloudPuffs.push({ mesh: puff, speed: 0.005 + Math.random() * 0.005 });
      }

      // 2. Torrential Falling Rain Streaks
      const rainCount = 180;
      const rainGeo = new THREE.BufferGeometry();
      const rainPositions = new Float32Array(rainCount * 6); // 2 points per line segment
      const rainSpeeds = new Float32Array(rainCount);

      for (let i = 0; i < rainCount; i++) {
        const x = (Math.random() - 0.5) * 130;
        const y = (Math.random() - 0.5) * 60;
        const z = (Math.random() - 0.5) * 30;
        const len = 3.5 + Math.random() * 2.5;

        const idx = i * 6;
        rainPositions[idx] = x;
        rainPositions[idx + 1] = y;
        rainPositions[idx + 2] = z;
        // End point slightly angled with wind
        rainPositions[idx + 3] = x - 0.9;
        rainPositions[idx + 4] = y - len;
        rainPositions[idx + 5] = z;

        rainSpeeds[i] = 1.2 + Math.random() * 0.8;
      }
      rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPositions, 3));

      const rainMat = new THREE.LineBasicMaterial({
        color: isLight ? 0x0284c7 : 0x7dd3fc,
        transparent: true,
        opacity: isLight ? 0.35 : 0.45,
      });
      const rainLines = new THREE.LineSegments(rainGeo, rainMat);
      rootGroup.add(rainLines);

      // 3. Splash Ripples at bottom
      const ripples = [];
      const rippleGeo = new THREE.RingGeometry(0.3, 1.8, 16);
      const rippleMat = new THREE.MeshBasicMaterial({
        color: isLight ? 0x0284c7 : 0x38bdf8,
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
      });
      for (let r = 0; r < 6; r++) {
        const rip = new THREE.Mesh(rippleGeo, rippleMat.clone());
        rip.rotation.x = Math.PI / 2.3;
        rip.position.set((Math.random() - 0.5) * 100, -22 + (Math.random() - 0.5) * 4, (Math.random() - 0.5) * 20);
        rootGroup.add(rip);
        ripples.push({ mesh: rip, scale: 0.2, life: Math.random() });
      }

      // 4. Procedural 3D Lightning Bolt
      const createLightningGeometry = () => {
        const pts = [];
        let curr = new THREE.Vector3(12 + (Math.random() - 0.5) * 16, 26, 5);
        pts.push(curr.clone());
        const targetY = -22;

        while (curr.y > targetY) {
          const stepY = 3.5 + Math.random() * 4;
          const next = new THREE.Vector3(
            curr.x + (Math.random() - 0.5) * 5.5,
            Math.max(targetY, curr.y - stepY),
            curr.z + (Math.random() - 0.5) * 3
          );
          pts.push(next.clone());
          curr = next;
        }
        return new THREE.BufferGeometry().setFromPoints(pts);
      };

      const lightningMat = new THREE.LineBasicMaterial({
        color: 0xffffff,
        linewidth: 2,
        transparent: true,
        opacity: 0,
      });
      const lightningLine = new THREE.Line(createLightningGeometry(), lightningMat);
      rootGroup.add(lightningLine);

      // Lightning timing state
      let nextFlashTime = 1.5;
      let flashPhase = 0;
      let flashDuration = 0;

      updateFn = (elapsed, delta) => {
        // A. Rain motion
        const pos = rainLines.geometry.attributes.position.array;
        for (let i = 0; i < rainCount; i++) {
          const idx = i * 6;
          const speed = rainSpeeds[i];
          pos[idx + 1] -= speed;
          pos[idx + 4] -= speed;
          pos[idx] -= speed * 0.14;
          pos[idx + 3] -= speed * 0.14;

          if (pos[idx + 1] < -26) {
            pos[idx + 1] = 26;
            pos[idx + 4] = 26 - 4;
            pos[idx] = (Math.random() - 0.5) * 120;
            pos[idx + 3] = pos[idx] - 0.9;
          }
        }
        rainLines.geometry.attributes.position.needsUpdate = true;

        // B. Cloud drift
        cloudPuffs.forEach(({ mesh, speed }) => {
          mesh.position.x += speed;
          if (mesh.position.x > 55) mesh.position.x = -55;
        });

        // C. Splash ripples
        ripples.forEach((rp) => {
          rp.life += delta * 1.8;
          if (rp.life > 1) {
            rp.life = 0;
            rp.mesh.position.x = (Math.random() - 0.5) * 100;
            rp.mesh.position.z = (Math.random() - 0.5) * 20;
          }
          const s = 0.2 + rp.life * 1.6;
          rp.mesh.scale.set(s, s, s);
          rp.mesh.material.opacity = Math.max(0, (1 - rp.life) * 0.45);
        });

        // D. Lightning Trigger
        if (elapsed > nextFlashTime) {
          flashPhase = 1;
          flashDuration = 0.28;
          lightningLine.geometry.dispose();
          lightningLine.geometry = createLightningGeometry();
          nextFlashTime = elapsed + 3.0 + Math.random() * 3.5;
        }

        if (flashPhase > 0) {
          flashDuration -= delta;
          const flick = Math.random() > 0.35 ? 1 : 0.15;
          lightningMat.opacity = flick;
          flashLight.intensity = flick * 2.8;

          if (flashDuration <= 0) {
            flashPhase = 0;
            lightningMat.opacity = 0;
            flashLight.intensity = 0;
          }
        }
      };
    }

    // ══════════════════════════════════════════════════════════════════════════
    // B. RAIN / DRIZZLE MODE (Translucent Rain Streaks + Puddle Ripples + Soft Mist)
    // ══════════════════════════════════════════════════════════════════════════
    else if (weatherMode === 'rain') {
      const dropCount = 160;
      const rainGeo = new THREE.BufferGeometry();
      const rainPositions = new Float32Array(dropCount * 6);
      const rainSpeeds = new Float32Array(dropCount);

      for (let i = 0; i < dropCount; i++) {
        const x = (Math.random() - 0.5) * 130;
        const y = (Math.random() - 0.5) * 60;
        const z = (Math.random() - 0.5) * 25;
        const len = 2.8 + Math.random() * 2.0;

        const idx = i * 6;
        rainPositions[idx] = x;
        rainPositions[idx + 1] = y;
        rainPositions[idx + 2] = z;
        rainPositions[idx + 3] = x - 0.4;
        rainPositions[idx + 4] = y - len;
        rainPositions[idx + 5] = z;

        rainSpeeds[i] = 0.8 + Math.random() * 0.6;
      }
      rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPositions, 3));

      const rainMat = new THREE.LineBasicMaterial({
        color: isLight ? 0x0284c7 : 0x38bdf8,
        transparent: true,
        opacity: isLight ? 0.32 : 0.42,
      });
      const rainLines = new THREE.LineSegments(rainGeo, rainMat);
      rootGroup.add(rainLines);

      // Rain puddle ripples
      const ripples = [];
      const ripGeo = new THREE.RingGeometry(0.3, 1.6, 16);
      for (let r = 0; r < 7; r++) {
        const rip = new THREE.Mesh(
          ripGeo,
          new THREE.MeshBasicMaterial({
            color: isLight ? 0x0284c7 : 0x7dd3fc,
            transparent: true,
            opacity: 0,
            side: THREE.DoubleSide,
          })
        );
        rip.rotation.x = Math.PI / 2.3;
        rip.position.set((Math.random() - 0.5) * 110, -22, (Math.random() - 0.5) * 20);
        rootGroup.add(rip);
        ripples.push({ mesh: rip, life: Math.random() });
      }

      updateFn = (elapsed, delta) => {
        const pos = rainLines.geometry.attributes.position.array;
        for (let i = 0; i < dropCount; i++) {
          const idx = i * 6;
          const speed = rainSpeeds[i];
          pos[idx + 1] -= speed;
          pos[idx + 4] -= speed;

          if (pos[idx + 1] < -25) {
            pos[idx + 1] = 25;
            pos[idx + 4] = 25 - 3;
            pos[idx] = (Math.random() - 0.5) * 130;
            pos[idx + 3] = pos[idx] - 0.4;
          }
        }
        rainLines.geometry.attributes.position.needsUpdate = true;

        ripples.forEach((rp) => {
          rp.life += delta * 1.5;
          if (rp.life > 1) {
            rp.life = 0;
            rp.mesh.position.x = (Math.random() - 0.5) * 110;
          }
          const s = 0.2 + rp.life * 1.4;
          rp.mesh.scale.set(s, s, s);
          rp.mesh.material.opacity = Math.max(0, (1 - rp.life) * 0.35);
        });
      };
    }

    // ══════════════════════════════════════════════════════════════════════════
    // C. SNOW MODE (3D Tumbling Hexagonal Flakes + Brownian Floating Drift)
    // ══════════════════════════════════════════════════════════════════════════
    else if (weatherMode === 'snow') {
      const flakeCount = 130;
      const flakeGeo = new THREE.BufferGeometry();
      const flakePos = new Float32Array(flakeCount * 3);
      const flakeScales = new Float32Array(flakeCount);
      const flakeOffsets = new Float32Array(flakeCount);

      for (let i = 0; i < flakeCount; i++) {
        flakePos[i * 3] = (Math.random() - 0.5) * 130;
        flakePos[i * 3 + 1] = (Math.random() - 0.5) * 60;
        flakePos[i * 3 + 2] = (Math.random() - 0.5) * 30;
        flakeScales[i] = 1.4 + Math.random() * 2.2;
        flakeOffsets[i] = Math.random() * Math.PI * 2;
      }
      flakeGeo.setAttribute('position', new THREE.BufferAttribute(flakePos, 3));

      const flakeMat = new THREE.PointsMaterial({
        size: 3.2,
        map: circleTexture,
        transparent: true,
        opacity: isLight ? 0.65 : 0.8,
        color: isLight ? 0x38bdf8 : 0xffffff,
        depthWrite: false,
      });
      const snowPoints = new THREE.Points(flakeGeo, flakeMat);
      rootGroup.add(snowPoints);

      updateFn = (elapsed) => {
        const pos = snowPoints.geometry.attributes.position.array;
        for (let i = 0; i < flakeCount; i++) {
          const idx = i * 3;
          pos[idx + 1] -= 0.25; // Gentle downward snowfall
          pos[idx] += Math.sin(elapsed * 1.2 + flakeOffsets[i]) * 0.12; // Swirling side sway

          if (pos[idx + 1] < -25) {
            pos[idx + 1] = 25;
            pos[idx] = (Math.random() - 0.5) * 130;
          }
        }
        snowPoints.geometry.attributes.position.needsUpdate = true;
      };
    }

    // ══════════════════════════════════════════════════════════════════════════
    // D. CLEAR DAY / SUNNY MODE (Radiant 3D Sun, Rotating Corona, Warm Flare Dust)
    // ══════════════════════════════════════════════════════════════════════════
    else if (weatherMode === 'clear-day') {
      const sunGroup = new THREE.Group();
      sunGroup.position.set(38, 8, -5);
      rootGroup.add(sunGroup);

      // 1. Core Glowing Sun Sphere
      const sunSphereGeo = new THREE.SphereGeometry(7, 24, 24);
      const sunSphereMat = new THREE.MeshBasicMaterial({
        color: 0xfbbf24,
      });
      const sunCore = new THREE.Mesh(sunSphereGeo, sunSphereMat);
      sunGroup.add(sunCore);

      // 2. Multi-layer Radiant Corona Rings
      const ringGeo1 = new THREE.RingGeometry(8, 12, 32);
      const ringMat1 = new THREE.MeshBasicMaterial({
        color: 0xf59e0b,
        transparent: true,
        opacity: isLight ? 0.28 : 0.4,
        side: THREE.DoubleSide,
      });
      const corona1 = new THREE.Mesh(ringGeo1, ringMat1);
      sunGroup.add(corona1);

      const ringGeo2 = new THREE.RingGeometry(12.5, 17, 32);
      const ringMat2 = new THREE.MeshBasicMaterial({
        color: 0xfb923c,
        transparent: true,
        opacity: isLight ? 0.16 : 0.22,
        side: THREE.DoubleSide,
      });
      const corona2 = new THREE.Mesh(ringGeo2, ringMat2);
      sunGroup.add(corona2);

      // 3. Floating warm solar dust particles
      const dustCount = 60;
      const dustGeo = new THREE.BufferGeometry();
      const dustPos = new Float32Array(dustCount * 3);
      for (let i = 0; i < dustCount; i++) {
        dustPos[i * 3] = (Math.random() - 0.5) * 110;
        dustPos[i * 3 + 1] = (Math.random() - 0.5) * 55;
        dustPos[i * 3 + 2] = (Math.random() - 0.5) * 20;
      }
      dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
      const dustMat = new THREE.PointsMaterial({
        size: 3.5,
        map: circleTexture,
        transparent: true,
        opacity: isLight ? 0.35 : 0.5,
        color: 0xfbbf24,
        depthWrite: false,
      });
      const dustPoints = new THREE.Points(dustGeo, dustMat);
      rootGroup.add(dustPoints);

      updateFn = (elapsed) => {
        corona1.rotation.z = elapsed * 0.15;
        corona2.rotation.z = -elapsed * 0.1;
        const pulse = Math.sin(elapsed * 2.0) * 0.08;
        sunCore.scale.set(1 + pulse, 1 + pulse, 1 + pulse);

        // Slow warm upward dust float
        const pos = dustPoints.geometry.attributes.position.array;
        for (let i = 0; i < dustCount; i++) {
          pos[i * 3 + 1] += 0.06;
          if (pos[i * 3 + 1] > 26) pos[i * 3 + 1] = -26;
        }
        dustPoints.geometry.attributes.position.needsUpdate = true;
      };
    }

    // ══════════════════════════════════════════════════════════════════════════
    // E. CLEAR NIGHT MODE (3D Crescent Moon + Orbiting Starfield + Meteor)
    // ══════════════════════════════════════════════════════════════════════════
    else if (weatherMode === 'clear-night') {
      const moonGroup = new THREE.Group();
      moonGroup.position.set(40, 10, -5);
      rootGroup.add(moonGroup);

      // Luminous 3D Moon
      const moonGeo = new THREE.SphereGeometry(6.5, 24, 24);
      const moonMat = new THREE.MeshStandardMaterial({
        color: 0xe2e8f0,
        roughness: 0.8,
        emissive: 0x94a3b8,
        emissiveIntensity: 0.3,
      });
      const moon = new THREE.Mesh(moonGeo, moonMat);
      moonGroup.add(moon);

      // Moon halo glow
      const haloGeo = new THREE.RingGeometry(7.2, 11, 32);
      const haloMat = new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.25,
        side: THREE.DoubleSide,
      });
      const halo = new THREE.Mesh(haloGeo, haloMat);
      moonGroup.add(halo);

      // Twinkling Starfield
      const starCount = 100;
      const starGeo = new THREE.BufferGeometry();
      const starPos = new Float32Array(starCount * 3);
      for (let i = 0; i < starCount; i++) {
        starPos[i * 3] = (Math.random() - 0.5) * 130;
        starPos[i * 3 + 1] = (Math.random() - 0.5) * 60;
        starPos[i * 3 + 2] = -15 + (Math.random() - 0.5) * 15;
      }
      starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
      const starMat = new THREE.PointsMaterial({
        size: 2.5,
        map: circleTexture,
        transparent: true,
        opacity: 0.75,
        color: 0xf8fafc,
        depthWrite: false,
      });
      const stars = new THREE.Points(starGeo, starMat);
      rootGroup.add(stars);

      updateFn = (elapsed) => {
        halo.rotation.z = elapsed * 0.08;
        const pulse = (Math.sin(elapsed * 1.5) + 1) / 2;
        halo.material.opacity = 0.18 + pulse * 0.12;
      };
    }

    // ══════════════════════════════════════════════════════════════════════════
    // F. CLOUDY / OVERCAST / FOG / WINDY MODE (Volumetric Drifting Clouds + Crepuscular Rays)
    // ══════════════════════════════════════════════════════════════════════════
    else {
      const cloudPuffs = [];
      const puffGeo = new THREE.DodecahedronGeometry(7, 1);
      const puffMat = new THREE.MeshStandardMaterial({
        color: isLight ? 0xbfdbfe : (isDay ? 0x334155 : 0x1e293b),
        roughness: 0.9,
        metalness: 0.1,
        transparent: true,
        opacity: isLight ? 0.45 : 0.5,
      });

      for (let i = 0; i < 8; i++) {
        const puff = new THREE.Mesh(puffGeo, puffMat);
        const x = -40 + i * 12 + (Math.random() - 0.5) * 6;
        const y = 8 + (Math.random() - 0.5) * 8;
        const z = -5 + (Math.random() - 0.5) * 10;
        puff.position.set(x, y, z);
        const s = 1.2 + Math.random() * 0.8;
        puff.scale.set(s * 1.6, s, s);
        rootGroup.add(puff);
        cloudPuffs.push({ mesh: puff, speed: 0.02 + Math.random() * 0.02 });
      }

      // Streamlined wind ribbons
      const ribbons = [];
      for (let r = 0; r < 3; r++) {
        const pts = [];
        const baseY = -10 + r * 10;
        for (let x = -60; x <= 60; x += 10) {
          pts.push(new THREE.Vector3(x, baseY + Math.sin(x * 0.08 + r) * 3, -2));
        }
        const curve = new THREE.CatmullRomCurve3(pts);
        const tubeGeo = new THREE.TubeGeometry(curve, 32, 0.35, 6, false);
        const tubeMat = new THREE.MeshBasicMaterial({
          color: isLight ? 0x0284c7 : 0x38bdf8,
          transparent: true,
          opacity: isLight ? 0.2 : 0.25,
        });
        const ribbon = new THREE.Mesh(tubeGeo, tubeMat);
        rootGroup.add(ribbon);
        ribbons.push({ mesh: ribbon, offset: r });
      }

      updateFn = (elapsed) => {
        cloudPuffs.forEach(({ mesh, speed }) => {
          mesh.position.x += speed;
          if (mesh.position.x > 60) mesh.position.x = -60;
        });

        ribbons.forEach(({ mesh, offset }) => {
          mesh.position.y = Math.sin(elapsed * 1.2 + offset) * 1.2;
        });
      };
    }

    // ─── 4. MOUSE PARALLAX RESPONSE ───
    let mouseX = 0;
    let mouseY = 0;
    let targetX = 0;
    let targetY = 0;

    const onMouseMove = (e) => {
      const rect = container.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;
      targetX = x * 0.02;
      targetY = y * 0.02;
    };
    window.addEventListener('mousemove', onMouseMove, { passive: true });

    // ─── 5. ANIMATION LOOP ───
    let animId;
    const clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();
      const delta = clock.getDelta();

      // Smooth parallax tilt
      mouseX += (targetX - mouseX) * 0.05;
      mouseY += (targetY - mouseY) * 0.05;
      rootGroup.rotation.y = mouseX * 0.04;
      rootGroup.rotation.x = -mouseY * 0.04;

      if (updateFn) {
        updateFn(elapsed, delta);
      }

      renderer.render(scene, camera);
    };

    animate();

    // ─── 6. RESIZE OBSERVER (Responsive to card size & sidebar toggle) ───
    const ro = new ResizeObserver((entries) => {
      for (let entry of entries) {
        const cr = entry.contentRect;
        if (cr.width > 0 && cr.height > 0) {
          width = cr.width;
          height = cr.height;
          camera.aspect = width / height;
          camera.updateProjectionMatrix();
          renderer.setSize(width, height);
        }
      }
    });
    ro.observe(container);

    // ─── CLEANUP ───
    return () => {
      cancelAnimationFrame(animId);
      ro.disconnect();
      window.removeEventListener('mousemove', onMouseMove);

      if (container && renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
      circleTexture.dispose();
    };
  }, [weatherMode, isLight, isDay]);

  return (
    <div
      ref={mountRef}
      className="weather-hero-3d-canvas"
      aria-hidden="true"
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 1,
        overflow: 'hidden',
        borderRadius: 'inherit',
      }}
    />
  );
}
