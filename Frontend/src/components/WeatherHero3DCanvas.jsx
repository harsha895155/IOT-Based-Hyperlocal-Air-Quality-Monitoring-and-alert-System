import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

/**
 * WeatherHero3DCanvas
 * Dynamic, GPU-accelerated 3D WebGL atmospheric weather canvas
 * that covers 100% of the Weather Hero Card edge-to-edge.
 *
 * Dynamically adapts to live weather reports:
 * - 'thunderstorm': Full-width rolling storm clouds, dynamic procedural lightning flashes, and edge-to-edge torrential rain with splash ripples.
 * - 'rain' / 'drizzle': Full-width falling translucent rain streaks and expanding ripple impacts.
 * - 'snow': 3D crystalline snowflakes swirling with Brownian motion across the whole card.
 * - 'clear-day': Radiant celestial Sun sphere, rotating corona rays, and warm solar dust particles across the entire card.
 * - 'clear-night': 3D crescent moon, twinkling cosmic starfield, and horizon meteor streaks.
 * - 'clouds' / 'fog' / 'mist': Volumetric multi-layer clouds undulating and drifting edge-to-edge.
 * - 'windy': Swooping aerodynamic wind ribbons with high-velocity vortex particles.
 */
export default function WeatherHero3DCanvas({
  condition = 'Thunderstorm',
  iconType = 'thunderstorm',
  isDay = true,
  theme = 'obsidian',
}) {
  const mountRef = useRef(null);
  const isLight = theme === 'light';

  // Classify Weather Condition into 3D Animation Mode
  const classifyMode = (cond, icon, day) => {
    const c = (cond || '').toLowerCase();
    const ic = (icon || '').toLowerCase();

    if (
      c.includes('thunder') ||
      c.includes('lightning') ||
      c.includes('storm') ||
      c.includes('squall') ||
      ic.includes('thunder') ||
      ic.includes('lightning') ||
      ic.includes('storm')
    ) {
      return 'thunderstorm';
    }
    if (c.includes('snow') || c.includes('flurr') || c.includes('ice') || c.includes('hail') || ic.includes('snow')) {
      return 'snow';
    }
    if (c.includes('rain') || c.includes('drizzle') || c.includes('shower') || ic.includes('rain') || ic.includes('drizzle')) {
      return 'rain';
    }
    if (!day) {
      return 'clear-night';
    }
    if (c.includes('clear') || c.includes('sunny') || ic.includes('clear')) {
      return 'clear-day';
    }
    if (c.includes('wind') || ic.includes('wind')) {
      return 'windy';
    }
    return 'clouds';
  };

  const weatherMode = classifyMode(condition, iconType, isDay);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    let width = container.clientWidth || 900;
    let height = container.clientHeight || 180;

    // 1. Scene & Camera Setup
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 0, 75);

    // Compute exact camera frustum bounds in 3D world units
    const calcFrustum = (w, h) => {
      const vFov = (camera.fov * Math.PI) / 180;
      const vHeight = 2 * Math.tan(vFov / 2) * camera.position.z;
      const vWidth = vHeight * (w / h);
      return {
        vWidth,
        vHeight,
        halfW: vWidth / 2,
        halfH: vHeight / 2,
      };
    };

    let frustum = calcFrustum(width, height);

    // 2. High-Performance Renderer
    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x000000, 0); // Transparent canvas
    container.appendChild(renderer.domElement);

    const rootGroup = new THREE.Group();
    scene.add(rootGroup);

    // 3. Dynamic Scene Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, isLight ? 0.92 : 0.65);
    scene.add(ambientLight);

    if (isLight) {
      // Subtle Cyberpunk Neon Electric Emerald & Violet pearlescent rim lighting
      const emeraldRim = new THREE.DirectionalLight(0x10b981, 0.45);
      emeraldRim.position.set(-60, 40, 35);
      scene.add(emeraldRim);

      const violetRim = new THREE.DirectionalLight(0x8b5cf6, 0.4);
      violetRim.position.set(60, -25, 35);
      scene.add(violetRim);
    }

    const flashLight = new THREE.PointLight(0xa5f3fc, 0, 300);
    flashLight.position.set(0, 25, 40);
    scene.add(flashLight);

    // Radial glow particle texture helper
    const createCircleTexture = () => {
      const cvs = document.createElement('canvas');
      cvs.width = 64;
      cvs.height = 64;
      const ctx = cvs.getContext('2d');
      const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
      grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
      grad.addColorStop(0.35, 'rgba(255, 255, 255, 0.85)');
      grad.addColorStop(0.75, 'rgba(255, 255, 255, 0.18)');
      grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 64, 64);
      return new THREE.CanvasTexture(cvs);
    };
    const circleTexture = createCircleTexture();

    let updateFn = null;

    // ══════════════════════════════════════════════════════════════════════════
    // A. THUNDERSTORM: FULL-WIDTH ROLLING CLOUDS + CRACKLING LIGHTNING + RAIN
    // ══════════════════════════════════════════════════════════════════════════
    if (weatherMode === 'thunderstorm') {
      // 1. Edge-to-edge rolling storm clouds spanning the entire card width
      const cloudPuffs = [];
      const cloudGeo = new THREE.DodecahedronGeometry(11, 1);
      const cloudMat = new THREE.MeshStandardMaterial({
        color: isLight ? 0x93c5fd : 0x1e293b,
        roughness: 0.95,
        metalness: 0.05,
        transparent: true,
        opacity: isLight ? 0.24 : 0.45,
      });

      const puffCount = Math.max(24, Math.round(frustum.vWidth / 14));
      const startX = -frustum.halfW - 25;
      const stepX = (frustum.vWidth + 50) / puffCount;

      for (let i = 0; i < puffCount; i++) {
        const puff = new THREE.Mesh(cloudGeo, cloudMat);
        const px = startX + i * stepX + (Math.random() - 0.5) * 12;
        const py = frustum.halfH - 2 + (Math.random() - 0.5) * 8;
        const pz = -12 + (Math.random() - 0.5) * 14;
        puff.position.set(px, py, pz);

        const s = 1.3 + Math.random() * 1.1;
        puff.scale.set(s * 1.7, s * 0.9, s);
        rootGroup.add(puff);
        cloudPuffs.push({
          mesh: puff,
          speed: 0.012 + Math.random() * 0.014,
        });
      }

      // 2. Edge-to-Edge Torrential Rain Streaks
      const rainCount = Math.max(260, Math.round(frustum.vWidth * 1.6));
      const rainGeo = new THREE.BufferGeometry();
      const rainPositions = new Float32Array(rainCount * 6);
      const rainSpeeds = new Float32Array(rainCount);

      for (let i = 0; i < rainCount; i++) {
        const x = (Math.random() - 0.5) * (frustum.vWidth + 40);
        const y = (Math.random() - 0.5) * (frustum.vHeight + 20);
        const z = (Math.random() - 0.5) * 25;
        const len = 3.8 + Math.random() * 3.2;

        const idx = i * 6;
        rainPositions[idx] = x;
        rainPositions[idx + 1] = y;
        rainPositions[idx + 2] = z;
        // Angled slightly with wind drift
        rainPositions[idx + 3] = x - 0.8;
        rainPositions[idx + 4] = y - len;
        rainPositions[idx + 5] = z;

        rainSpeeds[i] = 1.4 + Math.random() * 0.9;
      }
      rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPositions, 3));

      const rainMat = new THREE.LineBasicMaterial({
        color: isLight ? 0x0284c7 : 0x7dd3fc,
        transparent: true,
        opacity: isLight ? 0.32 : 0.45,
      });
      const rainLines = new THREE.LineSegments(rainGeo, rainMat);
      rootGroup.add(rainLines);

      // 3. Ground Splash Ripples across full card width
      const ripples = [];
      const rippleGeo = new THREE.RingGeometry(0.4, 2.2, 16);
      const rippleMat = new THREE.MeshBasicMaterial({
        color: isLight ? 0x0284c7 : 0x38bdf8,
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
      });

      const rippleCount = 14;
      for (let r = 0; r < rippleCount; r++) {
        const rip = new THREE.Mesh(rippleGeo, rippleMat.clone());
        rip.rotation.x = Math.PI / 2.3;
        const rx = (Math.random() - 0.5) * (frustum.vWidth * 0.92);
        const ry = -frustum.halfH + 3 + (Math.random() - 0.5) * 4;
        const rz = (Math.random() - 0.5) * 18;
        rip.position.set(rx, ry, rz);
        rootGroup.add(rip);
        ripples.push({ mesh: rip, life: Math.random() });
      }

      // 4. Procedural 3D Lightning Bolt across full width
      const createLightningGeometry = (strikeX) => {
        const pts = [];
        let curr = new THREE.Vector3(strikeX, frustum.halfH + 8, 4);
        pts.push(curr.clone());
        const targetY = -frustum.halfH;

        while (curr.y > targetY) {
          const stepY = 4 + Math.random() * 5;
          const next = new THREE.Vector3(
            curr.x + (Math.random() - 0.5) * 7.5,
            Math.max(targetY, curr.y - stepY),
            curr.z + (Math.random() - 0.5) * 4
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
      const lightningLine = new THREE.Line(createLightningGeometry(0), lightningMat);
      rootGroup.add(lightningLine);

      // Flash sequence timing
      let nextFlashTime = 1.2;
      let flashPhase = 0;
      let flashDuration = 0;

      updateFn = (elapsed, delta) => {
        // A. Rain motion across full width
        const pos = rainLines.geometry.attributes.position.array;
        const bottomLimit = -frustum.halfH - 8;
        const topSpawn = frustum.halfH + 8;
        const boundX = frustum.halfW + 20;

        for (let i = 0; i < rainCount; i++) {
          const idx = i * 6;
          const speed = rainSpeeds[i];
          pos[idx + 1] -= speed;
          pos[idx + 4] -= speed;
          pos[idx] -= speed * 0.12;
          pos[idx + 3] -= speed * 0.12;

          if (pos[idx + 1] < bottomLimit) {
            pos[idx + 1] = topSpawn;
            pos[idx + 4] = topSpawn - 4.5;
            pos[idx] = (Math.random() - 0.5) * (frustum.vWidth + 40);
            pos[idx + 3] = pos[idx] - 0.8;
          }
        }
        rainLines.geometry.attributes.position.needsUpdate = true;

        // B. Cloud drift across entire width
        cloudPuffs.forEach(({ mesh, speed }) => {
          mesh.position.x += speed;
          if (mesh.position.x > boundX) {
            mesh.position.x = -boundX;
          }
        });

        // C. Splash ripples across full width
        ripples.forEach((rp) => {
          rp.life += delta * 1.6;
          if (rp.life > 1) {
            rp.life = 0;
            rp.mesh.position.x = (Math.random() - 0.5) * (frustum.vWidth * 0.92);
          }
          const s = 0.2 + rp.life * 1.8;
          rp.mesh.scale.set(s, s, s);
          rp.mesh.material.opacity = Math.max(0, (1 - rp.life) * 0.4);
        });

        // D. Lightning Trigger across dynamic atmospheric locations
        if (elapsed > nextFlashTime) {
          flashPhase = 1;
          flashDuration = 0.38; // Rich multi-burst electric strike
          const strikeX = (Math.random() - 0.5) * (frustum.vWidth * 0.75);
          flashLight.position.x = strikeX;

          lightningLine.geometry.dispose();
          lightningLine.geometry = createLightningGeometry(strikeX);
          nextFlashTime = elapsed + 1.2 + Math.random() * 1.6; // Active, dynamic storm rhythm
        }

        if (flashPhase > 0) {
          flashDuration -= delta;
          // Multi-pulse realistic lightning crackle & flicker
          const flick = (Math.sin(elapsed * 45) > 0 || Math.random() > 0.3) ? 1 : 0.25;
          lightningMat.opacity = flick;
          flashLight.intensity = flick * 4.5;

          if (flashDuration <= 0) {
            flashPhase = 0;
            lightningMat.opacity = 0;
            flashLight.intensity = 0.15; // Soft residual storm cloud ambient illumination
          }
        }
      };
    }

    // ══════════════════════════════════════════════════════════════════════════
    // B. RAIN / DRIZZLE: FULL-WIDTH PRECIPITATION & MIST RIPPLES
    // ══════════════════════════════════════════════════════════════════════════
    else if (weatherMode === 'rain') {
      const dropCount = Math.max(220, Math.round(frustum.vWidth * 1.4));
      const rainGeo = new THREE.BufferGeometry();
      const rainPositions = new Float32Array(dropCount * 6);
      const rainSpeeds = new Float32Array(dropCount);

      for (let i = 0; i < dropCount; i++) {
        const x = (Math.random() - 0.5) * (frustum.vWidth + 30);
        const y = (Math.random() - 0.5) * (frustum.vHeight + 15);
        const z = (Math.random() - 0.5) * 25;
        const len = 3.0 + Math.random() * 2.4;

        const idx = i * 6;
        rainPositions[idx] = x;
        rainPositions[idx + 1] = y;
        rainPositions[idx + 2] = z;
        rainPositions[idx + 3] = x - 0.4;
        rainPositions[idx + 4] = y - len;
        rainPositions[idx + 5] = z;

        rainSpeeds[i] = 0.9 + Math.random() * 0.7;
      }
      rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPositions, 3));

      const rainMat = new THREE.LineBasicMaterial({
        color: isLight ? 0x0284c7 : 0x38bdf8,
        transparent: true,
        opacity: isLight ? 0.3 : 0.42,
      });
      const rainLines = new THREE.LineSegments(rainGeo, rainMat);
      rootGroup.add(rainLines);

      // Full-width puddles
      const ripples = [];
      const ripGeo = new THREE.RingGeometry(0.3, 1.8, 16);
      for (let r = 0; r < 12; r++) {
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
        rip.position.set((Math.random() - 0.5) * (frustum.vWidth * 0.9), -frustum.halfH + 2, (Math.random() - 0.5) * 20);
        rootGroup.add(rip);
        ripples.push({ mesh: rip, life: Math.random() });
      }

      updateFn = (elapsed, delta) => {
        const pos = rainLines.geometry.attributes.position.array;
        const bottomLimit = -frustum.halfH - 6;
        const topSpawn = frustum.halfH + 6;

        for (let i = 0; i < dropCount; i++) {
          const idx = i * 6;
          const speed = rainSpeeds[i];
          pos[idx + 1] -= speed;
          pos[idx + 4] -= speed;

          if (pos[idx + 1] < bottomLimit) {
            pos[idx + 1] = topSpawn;
            pos[idx + 4] = topSpawn - 3.5;
            pos[idx] = (Math.random() - 0.5) * (frustum.vWidth + 30);
            pos[idx + 3] = pos[idx] - 0.4;
          }
        }
        rainLines.geometry.attributes.position.needsUpdate = true;

        ripples.forEach((rp) => {
          rp.life += delta * 1.5;
          if (rp.life > 1) {
            rp.life = 0;
            rp.mesh.position.x = (Math.random() - 0.5) * (frustum.vWidth * 0.9);
          }
          const s = 0.2 + rp.life * 1.5;
          rp.mesh.scale.set(s, s, s);
          rp.mesh.material.opacity = Math.max(0, (1 - rp.life) * 0.35);
        });
      };
    }

    // ══════════════════════════════════════════════════════════════════════════
    // C. SNOW: FULL-WIDTH BROWNIAN CRYSTALLINE SNOWFLAKES
    // ══════════════════════════════════════════════════════════════════════════
    else if (weatherMode === 'snow') {
      const flakeCount = Math.max(180, Math.round(frustum.vWidth * 1.2));
      const flakeGeo = new THREE.BufferGeometry();
      const flakePos = new Float32Array(flakeCount * 3);
      const flakeOffsets = new Float32Array(flakeCount);

      for (let i = 0; i < flakeCount; i++) {
        flakePos[i * 3] = (Math.random() - 0.5) * (frustum.vWidth + 30);
        flakePos[i * 3 + 1] = (Math.random() - 0.5) * (frustum.vHeight + 15);
        flakePos[i * 3 + 2] = (Math.random() - 0.5) * 30;
        flakeOffsets[i] = Math.random() * Math.PI * 2;
      }
      flakeGeo.setAttribute('position', new THREE.BufferAttribute(flakePos, 3));

      const flakeMat = new THREE.PointsMaterial({
        size: 3.5,
        map: circleTexture,
        transparent: true,
        opacity: isLight ? 0.6 : 0.8,
        color: isLight ? 0x0284c7 : 0xffffff,
        depthWrite: false,
      });
      const snowPoints = new THREE.Points(flakeGeo, flakeMat);
      rootGroup.add(snowPoints);

      updateFn = (elapsed) => {
        const pos = snowPoints.geometry.attributes.position.array;
        const bottomLimit = -frustum.halfH - 6;
        const topSpawn = frustum.halfH + 6;

        for (let i = 0; i < flakeCount; i++) {
          const idx = i * 3;
          pos[idx + 1] -= 0.28;
          pos[idx] += Math.sin(elapsed * 1.4 + flakeOffsets[i]) * 0.15;

          if (pos[idx + 1] < bottomLimit) {
            pos[idx + 1] = topSpawn;
            pos[idx] = (Math.random() - 0.5) * (frustum.vWidth + 30);
          }
        }
        snowPoints.geometry.attributes.position.needsUpdate = true;
      };
    }

    // ══════════════════════════════════════════════════════════════════════════
    // D. CLEAR DAY: CELESTIAL SUN & EDGE-TO-EDGE WARM SOLAR DUST
    // ══════════════════════════════════════════════════════════════════════════
    else if (weatherMode === 'clear-day') {
      const sunGroup = new THREE.Group();
      sunGroup.position.set(frustum.halfW * 0.65, frustum.halfH * 0.25, -6);
      rootGroup.add(sunGroup);

      const sunCore = new THREE.Mesh(
        new THREE.SphereGeometry(8.5, 24, 24),
        new THREE.MeshBasicMaterial({ color: 0xfbbf24 })
      );
      sunGroup.add(sunCore);

      const corona1 = new THREE.Mesh(
        new THREE.RingGeometry(9.5, 14, 32),
        new THREE.MeshBasicMaterial({
          color: 0xf59e0b,
          transparent: true,
          opacity: isLight ? 0.25 : 0.38,
          side: THREE.DoubleSide,
        })
      );
      sunGroup.add(corona1);

      const corona2 = new THREE.Mesh(
        new THREE.RingGeometry(15, 21, 32),
        new THREE.MeshBasicMaterial({
          color: 0xfb923c,
          transparent: true,
          opacity: isLight ? 0.15 : 0.2,
          side: THREE.DoubleSide,
        })
      );
      sunGroup.add(corona2);

      // Edge-to-edge floating warm golden dust
      const dustCount = Math.max(90, Math.round(frustum.vWidth * 0.6));
      const dustGeo = new THREE.BufferGeometry();
      const dustPos = new Float32Array(dustCount * 3);
      for (let i = 0; i < dustCount; i++) {
        dustPos[i * 3] = (Math.random() - 0.5) * (frustum.vWidth + 20);
        dustPos[i * 3 + 1] = (Math.random() - 0.5) * (frustum.vHeight + 10);
        dustPos[i * 3 + 2] = (Math.random() - 0.5) * 25;
      }
      dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
      const dustMat = new THREE.PointsMaterial({
        size: 3.5,
        map: circleTexture,
        transparent: true,
        opacity: isLight ? 0.32 : 0.48,
        color: 0xfbbf24,
        depthWrite: false,
      });
      const dustPoints = new THREE.Points(dustGeo, dustMat);
      rootGroup.add(dustPoints);

      updateFn = (elapsed) => {
        corona1.rotation.z = elapsed * 0.12;
        corona2.rotation.z = -elapsed * 0.08;
        const pulse = Math.sin(elapsed * 2.0) * 0.08;
        sunCore.scale.set(1 + pulse, 1 + pulse, 1 + pulse);

        const pos = dustPoints.geometry.attributes.position.array;
        const topLimit = frustum.halfH + 6;
        for (let i = 0; i < dustCount; i++) {
          pos[i * 3 + 1] += 0.07;
          if (pos[i * 3 + 1] > topLimit) pos[i * 3 + 1] = -frustum.halfH - 6;
        }
        dustPoints.geometry.attributes.position.needsUpdate = true;
      };
    }

    // ══════════════════════════════════════════════════════════════════════════
    // E. CLEAR NIGHT: LUMINOUS MOON & FULL-WIDTH COSMIC STARFIELD
    // ══════════════════════════════════════════════════════════════════════════
    else if (weatherMode === 'clear-night') {
      const moonGroup = new THREE.Group();
      moonGroup.position.set(frustum.halfW * 0.65, frustum.halfH * 0.25, -6);
      rootGroup.add(moonGroup);

      const moon = new THREE.Mesh(
        new THREE.SphereGeometry(7.5, 24, 24),
        new THREE.MeshStandardMaterial({
          color: 0xe2e8f0,
          roughness: 0.8,
          emissive: 0x94a3b8,
          emissiveIntensity: 0.3,
        })
      );
      moonGroup.add(moon);

      const halo = new THREE.Mesh(
        new THREE.RingGeometry(8.5, 13, 32),
        new THREE.MeshBasicMaterial({
          color: 0x38bdf8,
          transparent: true,
          opacity: 0.22,
          side: THREE.DoubleSide,
        })
      );
      moonGroup.add(halo);

      // Starfield across full card
      const starCount = Math.max(130, Math.round(frustum.vWidth * 0.8));
      const starGeo = new THREE.BufferGeometry();
      const starPos = new Float32Array(starCount * 3);
      for (let i = 0; i < starCount; i++) {
        starPos[i * 3] = (Math.random() - 0.5) * (frustum.vWidth + 20);
        starPos[i * 3 + 1] = (Math.random() - 0.5) * (frustum.vHeight + 10);
        starPos[i * 3 + 2] = -15 + (Math.random() - 0.5) * 15;
      }
      starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
      const starMat = new THREE.PointsMaterial({
        size: 2.8,
        map: circleTexture,
        transparent: true,
        opacity: 0.75,
        color: 0xf8fafc,
        depthWrite: false,
      });
      const stars = new THREE.Points(starGeo, starMat);
      rootGroup.add(stars);

      updateFn = (elapsed) => {
        halo.rotation.z = elapsed * 0.06;
        const pulse = (Math.sin(elapsed * 1.5) + 1) / 2;
        halo.material.opacity = 0.15 + pulse * 0.12;
      };
    }

    // ══════════════════════════════════════════════════════════════════════════
    // F. CLOUDY / OVERCAST / FOG / WINDY: FULL-WIDTH VOLUMETRIC DRIFT & WIND
    // ══════════════════════════════════════════════════════════════════════════
    else {
      const cloudPuffs = [];
      const puffGeo = new THREE.DodecahedronGeometry(10, 1);
      const puffMat = new THREE.MeshStandardMaterial({
        color: isLight ? 0xbae6fd : (isDay ? 0x334155 : 0x1e293b),
        roughness: 0.95,
        metalness: 0.05,
        transparent: true,
        opacity: isLight ? 0.22 : 0.45,
      });

      const puffCount = Math.max(20, Math.round(frustum.vWidth / 15));
      const startX = -frustum.halfW - 20;
      const stepX = (frustum.vWidth + 40) / puffCount;

      for (let i = 0; i < puffCount; i++) {
        const puff = new THREE.Mesh(puffGeo, puffMat);
        const px = startX + i * stepX + (Math.random() - 0.5) * 10;
        const py = frustum.halfH * 0.35 + (Math.random() - 0.5) * 10;
        const pz = -6 + (Math.random() - 0.5) * 12;
        puff.position.set(px, py, pz);

        const s = 1.3 + Math.random() * 1.0;
        puff.scale.set(s * 1.8, s, s);
        rootGroup.add(puff);
        cloudPuffs.push({ mesh: puff, speed: 0.02 + Math.random() * 0.02 });
      }

      // Streamlined wind ribbons across entire width
      const ribbons = [];
      const boundX = frustum.halfW + 15;
      for (let r = 0; r < 3; r++) {
        const pts = [];
        const baseY = -frustum.halfH * 0.3 + r * 10;
        for (let x = -boundX; x <= boundX; x += 15) {
          pts.push(new THREE.Vector3(x, baseY + Math.sin(x * 0.06 + r) * 4, -2));
        }
        const curve = new THREE.CatmullRomCurve3(pts);
        const tubeGeo = new THREE.TubeGeometry(curve, 48, 0.4, 6, false);
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
          if (mesh.position.x > boundX) mesh.position.x = -boundX;
        });

        ribbons.forEach(({ mesh, offset }) => {
          mesh.position.y = Math.sin(elapsed * 1.2 + offset) * 1.4;
        });
      };
    }

    // ─── 4. SMOOTH MOUSE PARALLAX TILT ───
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

    // ─── 6. RESIZE OBSERVER (Full responsiveness on card or sidebar resize) ───
    const ro = new ResizeObserver((entries) => {
      for (let entry of entries) {
        const cr = entry.contentRect;
        if (cr.width > 0 && cr.height > 0) {
          width = cr.width;
          height = cr.height;
          camera.aspect = width / height;
          camera.updateProjectionMatrix();
          renderer.setSize(width, height);
          frustum = calcFrustum(width, height);
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
