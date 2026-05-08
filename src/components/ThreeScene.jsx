import React, { useRef, useEffect, useCallback } from 'react';
import * as THREE from 'three';
import { buildDarkstarModel, createBlueprintGrid, createExhaustCones } from './aircraft/DarkstarModel.js';

/**
 * ThreeScene
 * Full Three.js canvas with:
 *  - Orbiting camera driven by scroll position
 *  - Wireframe ↔ shaded model transition
 *  - Dynamic environment / lighting
 *  - Post-glow bloom via unreal bloom (simplified via additive layers)
 */
const ThreeScene = ({
  rotateY = 0,
  rotateX = 2,
  shadingProgress = 0,
  envProgress = 0,
  reentryProgress = 0,
  speedStreaks = false,
  phase = 'hero',
  scrollProgress = 0,
}) => {
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);
  const modelRef = useRef(null);
  const gridRef = useRef(null);
  const exhaustRef = useRef(null);
  const lightsRef = useRef({});
  const particlesRef = useRef(null);
  const streaksRef = useRef(null);
  const mouseRef = useRef({ x: 0, y: 0 });
  const targetMouseRef = useRef({ x: 0, y: 0 });
  const frameRef = useRef(null);
  const clockRef = useRef(new THREE.Clock());
  const duskTextureRef = useRef(null);

  // Live props consumed by the animation loop. Reading from a ref means the
  // RAF closure always sees fresh values without tearing the loop down on
  // every scroll tick (which is what was starving the rotation in dev).
  const propsRef = useRef({
    rotateY, rotateX, shadingProgress, envProgress,
    reentryProgress, speedStreaks, phase, scrollProgress,
  });
  propsRef.current = {
    rotateY, rotateX, shadingProgress, envProgress,
    reentryProgress, speedStreaks, phase, scrollProgress,
  };

  // ── Initialize Three.js scene ──────────────────────────────────────────
  const init = useCallback(() => {
    if (!mountRef.current) return;

    const width = mountRef.current.clientWidth;
    const height = mountRef.current.clientHeight;

    // Renderer
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Scene
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x020810, 0.012);
    sceneRef.current = scene;

    // Camera — boots at left side profile (camera on -X axis).
    const camera = new THREE.PerspectiveCamera(35, width / height, 0.1, 200);
    camera.position.set(-14, 2.5, 0);
    camera.lookAt(0, 0, 2);
    cameraRef.current = camera;

    // ── Build model ──────────────────────────────────────────────────────
    const { wireframeGroup, shadedGroup, allGroups } = buildDarkstarModel();
    shadedGroup.visible = false;
    modelRef.current = { wireframeGroup, shadedGroup, allGroups };
    scene.add(allGroups);

    // ── Blueprint grid ───────────────────────────────────────────────────
    const grid = createBlueprintGrid();
    gridRef.current = grid;
    scene.add(grid);

    // ── Engine exhaust cones ─────────────────────────────────────────────
    const exhaust = createExhaustCones();
    exhaust.visible = false;
    exhaustRef.current = exhaust;
    scene.add(exhaust);

    // ── Lighting ─────────────────────────────────────────────────────────
    // Ambient (always present) — lifted from 0.6 so the dark navy airframe
    // never falls completely into shadow.
    const ambient = new THREE.AmbientLight(0x2a4068, 0.85);
    scene.add(ambient);

    // Key light (top front)
    const keyLight = new THREE.DirectionalLight(0x4488cc, 2.0);
    keyLight.position.set(5, 8, 10);
    scene.add(keyLight);

    // Rim light (cyan, back-left)
    const rimLight = new THREE.DirectionalLight(0x40c8ff, 1.6);
    rimLight.position.set(-5, 3, -8);
    scene.add(rimLight);

    // Fill light (subtle warm, from below)
    const fillLight = new THREE.DirectionalLight(0x553a25, 0.55);
    fillLight.position.set(0, -4, 5);
    scene.add(fillLight);

    // Warm dusk back-rim — off in hero/wireframe, ramps up in cinematic so the
    // shaded airframe gets a horizon-glow edge instead of dissolving into the sky.
    const warmRim = new THREE.DirectionalLight(0xff7544, 0);
    warmRim.position.set(-3, 1.5, -10);
    scene.add(warmRim);

    // Top-side dusk fill — picks out the upper surface from above with a cool
    // dusk-violet tone, again gated to cinematic.
    const duskTop = new THREE.DirectionalLight(0x7a5fa0, 0);
    duskTop.position.set(2, 8, -4);
    scene.add(duskTop);

    // Point light for canopy glow
    const canopyLight = new THREE.PointLight(0x00ccff, 1, 6);
    canopyLight.position.set(0, 0.6, 7.2);
    scene.add(canopyLight);

    // Reentry heat light (starts off)
    const heatLight = new THREE.PointLight(0xff4400, 0, 20);
    heatLight.position.set(0, 0, 10);
    scene.add(heatLight);

    // Engine glow light (starts off)
    const engineLight = new THREE.PointLight(0xff6600, 0, 8);
    engineLight.position.set(0, -0.1, -5);
    scene.add(engineLight);

    lightsRef.current = { ambient, keyLight, rimLight, fillLight, warmRim, duskTop, canopyLight, heatLight, engineLight };

    // ── Speed streak particles ───────────────────────────────────────────
    const streakCount = 200;
    const streakGeo = new THREE.BufferGeometry();
    const streakPositions = new Float32Array(streakCount * 3);
    const streakVelocities = new Float32Array(streakCount);

    for (let i = 0; i < streakCount; i++) {
      streakPositions[i * 3] = (Math.random() - 0.5) * 30;
      streakPositions[i * 3 + 1] = (Math.random() - 0.5) * 15;
      streakPositions[i * 3 + 2] = (Math.random() - 0.5) * 40;
      streakVelocities[i] = 0.3 + Math.random() * 0.7;
    }
    streakGeo.setAttribute('position', new THREE.BufferAttribute(streakPositions, 3));

    const streakMat = new THREE.PointsMaterial({
      color: 0x00aaff,
      size: 0.06,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
    });
    const streaks = new THREE.Points(streakGeo, streakMat);
    streaks.visible = false;
    streaksRef.current = { mesh: streaks, velocities: streakVelocities };
    scene.add(streaks);

    // ── Particle dust (ambient) ──────────────────────────────────────────
    const dustCount = 80;
    const dustGeo = new THREE.BufferGeometry();
    const dustPositions = new Float32Array(dustCount * 3);
    for (let i = 0; i < dustCount; i++) {
      dustPositions[i * 3] = (Math.random() - 0.5) * 25;
      dustPositions[i * 3 + 1] = (Math.random() - 0.5) * 10;
      dustPositions[i * 3 + 2] = (Math.random() - 0.5) * 25;
    }
    dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3));
    const dustMat = new THREE.PointsMaterial({
      color: 0x3388aa,
      size: 0.04,
      transparent: true,
      opacity: 0.3,
      blending: THREE.AdditiveBlending,
    });
    const dust = new THREE.Points(dustGeo, dustMat);
    particlesRef.current = dust;
    scene.add(dust);

    // ── Environment map (simple procedural) ──────────────────────────────
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const envScene = new THREE.Scene();
    envScene.background = new THREE.Color(0x050a14);

    // Add some soft lights to the env scene for reflections
    const envLight1 = new THREE.DirectionalLight(0x2060a0, 2);
    envLight1.position.set(0, 1, 0);
    envScene.add(envLight1);
    const envLight2 = new THREE.DirectionalLight(0x005080, 1);
    envLight2.position.set(0, -1, 0.5);
    envScene.add(envLight2);

    const envMap = pmremGenerator.fromScene(envScene).texture;
    scene.environment = envMap;
    pmremGenerator.dispose();

    // ── Dusk sky gradient (cinematic backdrop) ──────────────────────────
    // Painted once into a 1×512 canvas, used as scene.background during the
    // cinematic phase so the fully shaded aircraft has a luminous sky to
    // silhouette against instead of dissolving into solid black.
    const duskCanvas = document.createElement('canvas');
    duskCanvas.width = 4;
    duskCanvas.height = 512;
    const dctx = duskCanvas.getContext('2d');
    const dgrad = dctx.createLinearGradient(0, 0, 0, 512);
    dgrad.addColorStop(0.00, '#0a0822');   // deep night top
    dgrad.addColorStop(0.32, '#241c48');   // indigo
    dgrad.addColorStop(0.62, '#5a2d4c');   // dusk magenta
    dgrad.addColorStop(0.84, '#a04830');   // dusk orange band
    dgrad.addColorStop(1.00, '#d97a4f');   // warm horizon
    dctx.fillStyle = dgrad;
    dctx.fillRect(0, 0, 4, 512);
    const duskTexture = new THREE.CanvasTexture(duskCanvas);
    duskTexture.colorSpace = THREE.SRGBColorSpace;
    duskTextureRef.current = duskTexture;
  }, []);

  // ── Mouse tracking ─────────────────────────────────────────────────────
  useEffect(() => {
    const onMove = (e) => {
      targetMouseRef.current = {
        x: (e.clientX / window.innerWidth) * 2 - 1,
        y: -(e.clientY / window.innerHeight) * 2 + 1,
      };
    };
    window.addEventListener('mousemove', onMove, { passive: true });
    return () => window.removeEventListener('mousemove', onMove);
  }, []);

  // ── Resize handler ─────────────────────────────────────────────────────
  useEffect(() => {
    const onResize = () => {
      if (!mountRef.current || !rendererRef.current || !cameraRef.current) return;
      const w = mountRef.current.clientWidth;
      const h = mountRef.current.clientHeight;
      rendererRef.current.setSize(w, h);
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // ── Initialize on mount ────────────────────────────────────────────────
  useEffect(() => {
    init();

    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      if (rendererRef.current && mountRef.current) {
        mountRef.current.removeChild(rendererRef.current.domElement);
        rendererRef.current.dispose();
      }
    };
  }, [init]);

  // ── Animation loop (scroll-driven + time-driven) ──────────────────────
  // Stable: this effect runs once. Each frame reads the latest props from
  // propsRef.current so we never tear down + rebuild the RAF loop.
  useEffect(() => {
    const animate = () => {
      frameRef.current = requestAnimationFrame(animate);

      const camera = cameraRef.current;
      const model = modelRef.current;
      const grid = gridRef.current;
      const exhaust = exhaustRef.current;
      const lights = lightsRef.current;
      const renderer = rendererRef.current;
      const scene = sceneRef.current;
      const streaks = streaksRef.current;
      const dust = particlesRef.current;

      if (!camera || !model || !renderer || !scene) return;

      const {
        rotateY, rotateX, shadingProgress, envProgress,
        reentryProgress, speedStreaks, phase,
      } = propsRef.current;

      const elapsed = clockRef.current.getElapsedTime();

      // ── Smooth mouse ─────────────────────────────────────────────────
      mouseRef.current.x += (targetMouseRef.current.x - mouseRef.current.x) * 0.04;
      mouseRef.current.y += (targetMouseRef.current.y - mouseRef.current.y) * 0.04;

      // ── Camera orbit driven by scroll ────────────────────────────────
      // The aircraft's nose is at +Z. We add a −90° offset so rotateY=0
      // places the camera on the −X axis (i.e. looking at the left side
      // profile of the aircraft), which is the design-spec start view.
      const orbitAngle = THREE.MathUtils.degToRad(-rotateY - 90);
      const tiltAngle = THREE.MathUtils.degToRad(rotateX);

      let orbitRadius = 14;
      let orbitHeight = 2.5;
      let lookAtY = 0;

      if (phase === 'wireframe') {
        orbitRadius = 13;
        orbitHeight = 3.5;
      } else if (phase === 'cinematic') {
        orbitRadius = 11;
        orbitHeight = 2;
        lookAtY = -0.2;
      } else if (phase === 'final') {
        orbitRadius = 14;
        orbitHeight = 2.5;
      }

      const mouseOffsetX = mouseRef.current.x * 1.5;
      const mouseOffsetY = mouseRef.current.y * 0.8;

      const camX = Math.sin(orbitAngle) * orbitRadius + mouseOffsetX;
      const camZ = Math.cos(orbitAngle) * orbitRadius;
      const camY = orbitHeight + Math.sin(tiltAngle) * 2 + mouseOffsetY;

      camera.position.lerp(new THREE.Vector3(camX, camY, camZ), 0.08);
      camera.lookAt(0, lookAtY, 2);

      // ── Model visibility: wireframe vs shaded ───────────────────────
      model.wireframeGroup.visible = shadingProgress < 0.98;
      model.shadedGroup.visible = shadingProgress > 0.02;

      model.wireframeGroup.traverse(child => {
        if (child.material && child.material.transparent) {
          child.material.opacity = child.material._baseOpacity != null
            ? child.material._baseOpacity * (1 - shadingProgress)
            : (1 - shadingProgress) * 0.7;
        }
      });

      model.shadedGroup.traverse(child => {
        if (child.material) {
          if (child.material.transparent) {
            child.material.opacity = shadingProgress * (child.material._baseOpacity || 0.85);
          }
        }
      });

      if (grid) {
        grid.visible = shadingProgress < 0.7;
        grid.traverse(child => {
          if (child.material) {
            child.material.opacity = (1 - shadingProgress * 1.5) * (child.material === grid.children[0]?.material ? 0.35 : 0.15);
          }
        });
      }

      if (exhaust) {
        exhaust.visible = phase === 'cinematic' || phase === 'final';
        exhaust.children.forEach(cone => {
          const mat = cone.material;
          mat.opacity = reentryProgress > 0.2
            ? 0.25 + reentryProgress * 0.4
            : envProgress * 0.3;
          mat.color.setHex(reentryProgress > 0.3 ? 0xff2200 : 0xff6600);

          const pulse = 1 + Math.sin(elapsed * 8 + Math.random()) * 0.08;
          cone.scale.set(pulse, pulse, 1 + envProgress * 0.4);
        });
      }

      if (lights.heatLight) {
        // Capped lower than before so the boundary-layer moment stays a warm
        // accent on the airframe rather than overwhelming it against dusk.
        lights.heatLight.intensity = reentryProgress * 1.8;
        lights.heatLight.color.setHex(reentryProgress > 0.5 ? 0xff5022 : 0xff7733);
      }
      if (lights.engineLight) {
        lights.engineLight.intensity = (phase === 'cinematic' ? 2 : 0) * envProgress;
      }
      if (lights.canopyLight) {
        lights.canopyLight.intensity = shadingProgress > 0.5 ? 1.5 : 0.5;
      }

      // ── Cinematic dusk light boost ──────────────────────────────────
      // Brings up ambient + rim and fades in the warm dusk back-rim so the
      // shaded airframe has clear silhouette and surface curvature.
      const cineMix = phase === 'cinematic' ? 1 : 0;
      const reentryDamp = 1 - reentryProgress * 0.6;  // back off as reentry red takes over
      if (lights.ambient) {
        lights.ambient.intensity = 0.85 + cineMix * 0.45;
      }
      if (lights.rimLight) {
        lights.rimLight.intensity = 1.6 + cineMix * 0.9;
      }
      if (lights.warmRim) {
        lights.warmRim.intensity = cineMix * reentryDamp * 1.9;
      }
      if (lights.duskTop) {
        lights.duskTop.intensity = cineMix * reentryDamp * 1.0;
      }

      // Bounce more of the (dusk) environment map off the airframe in
      // cinematic — the metal materials draw most of their colour from env.
      if (model && model.shadedGroup) {
        const targetEnv = phase === 'cinematic' ? 2.6 : 1.5;
        model.shadedGroup.traverse(child => {
          if (child.material && child.material.envMapIntensity !== undefined) {
            child.material.envMapIntensity = targetEnv;
          }
        });
      }

      if (scene.fog) {
        // Hold fog at a light level through cinematic so the dusk backdrop and
        // airframe stay readable — no reentry-driven thickening.
        scene.fog.density = phase === 'cinematic' ? 0.005 : 0.012;
      }

      if (streaks) {
        streaks.mesh.visible = speedStreaks;
        streaks.mesh.material.opacity = speedStreaks ? 0.5 + reentryProgress * 0.4 : 0;
        streaks.mesh.material.color.setHex(reentryProgress > 0.3 ? 0xff6633 : 0x00aaff);

        if (speedStreaks) {
          const positions = streaks.mesh.geometry.attributes.position.array;
          for (let i = 0; i < positions.length / 3; i++) {
            positions[i * 3 + 2] -= streaks.velocities[i] * 1.5;
            if (positions[i * 3 + 2] < -20) {
              positions[i * 3 + 2] = 20;
              positions[i * 3] = (Math.random() - 0.5) * 30;
              positions[i * 3 + 1] = (Math.random() - 0.5) * 15;
            }
          }
          streaks.mesh.geometry.attributes.position.needsUpdate = true;
        }
      }

      if (dust) {
        dust.rotation.y = elapsed * 0.02;
      }

      // Background selection:
      //  - cinematic: dusk sky texture is held for the full phase (including
      //    the boundary-layer/reentry moment) so the silhouette never sinks
      //    into a dark wash.
      //  - hero/wireframe/final: solid dark via clearColor.
      const useDusk = phase === 'cinematic';
      if (useDusk && duskTextureRef.current) {
        scene.background = duskTextureRef.current;
      } else {
        scene.background = null;
        const bgColor = new THREE.Color();
        if (envProgress > 0.3 && phase !== 'final') {
          bgColor.lerpColors(new THREE.Color(0x020810), new THREE.Color(0x141028), envProgress);
        } else {
          bgColor.set(0x020810);
        }
        renderer.setClearColor(bgColor, 1);
      }

      renderer.render(scene, camera);
    };

    frameRef.current = requestAnimationFrame(animate);
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, []);

  // ── Store base opacities on first model creation ───────────────────────
  useEffect(() => {
    if (!modelRef.current) return;
    const storeBase = (group) => {
      group.traverse(child => {
        if (child.material && child.material.transparent && child.material._baseOpacity == null) {
          child.material._baseOpacity = child.material.opacity;
        }
      });
    };
    storeBase(modelRef.current.wireframeGroup);
    storeBase(modelRef.current.shadedGroup);
  }, []);

  return (
    <div
      ref={mountRef}
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 5,
      }}
    />
  );
};

export default ThreeScene;
