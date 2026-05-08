import { useState, useEffect, useRef, useCallback } from 'react';

// ─── Easing Functions ─────────────────────────────────────────────────────────
const easeInOut = (t) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
const easeOut = (t) => 1 - Math.pow(1 - t, 3);
const easeIn = (t) => t * t * t;

// ─── Clamp & Lerp Helpers ─────────────────────────────────────────────────────
const clamp = (val, min, max) => Math.min(Math.max(val, min), max);
const mapRange = (val, inMin, inMax, outMin, outMax) => {
  const ratio = clamp((val - inMin) / (inMax - inMin), 0, 1);
  return outMin + (outMax - outMin) * ratio;
};

/**
 * useScrollAnimation
 * Maps full-page scroll position to animation state. Operates against the
 * document so the persistent aircraft canvas (fixed background in App.jsx)
 * stays in sync no matter which section is in the viewport.
 *
 * Phase Breakdown (by scrollProgress 0→1) — calibrated for a layout of
 * Hero(100vh) + ScrollSection(520vh) + Final(100vh) → max scroll ≈ 620vh:
 *   0.00 → 0.16  : hero (left profile, static wireframe)
 *   0.16 → 0.55  : wireframe (orbital sweep + annotations)
 *   0.55 → 0.84  : cinematic (shaded + environment)
 *   0.84 → 1.00  : final (return to left profile)
 */
export function useScrollAnimation() {
  const [state, setState] = useState({
    scrollProgress: 0,
    phase: 'hero',       // 'hero' | 'wireframe' | 'cinematic' | 'final'
    rotateY: 0,           // degrees of camera orbit relative to the start view
    rotateX: 2,           // slight nose-down tilt
    shadingProgress: 0,   // 0=wireframe, 1=fully shaded
    envProgress: 0,       // 0=blueprint bg, 1=space bg
    reentryProgress: 0,   // 0→1 reentry glow
    annotationProgress: [ // per-annotation visibility 0→1
      0, 0, 0, 0, 0
    ],
    speedStreaks: false,   // show speed streak particles
  });

  const rafRef = useRef(null);

  const compute = useCallback(() => {
    const scrollTop = window.scrollY;
    const winH = window.innerHeight;
    const max = document.documentElement.scrollHeight - winH;
    const scrollProgress = max > 0 ? clamp(scrollTop / max, 0, 1) : 0;

    // ── Phase boundaries (full-page scroll) ──────────────────────────────────
    const P1_START = 0.16;
    const P1_END   = 0.55;
    const P2_START = 0.55;
    const P2_END   = 0.84;
    const P3_START = 0.84;
    const P3_END   = 1.00;

    // ── Determine phase ───────────────────────────────────────────────────────
    let phase = 'hero';
    if (scrollProgress >= P3_START)   phase = 'final';
    else if (scrollProgress >= P2_START) phase = 'cinematic';
    else if (scrollProgress >= P1_START) phase = 'wireframe';

    // ── Rotation ─────────────────────────────────────────────────────────────
    // Phase 1: sweep from 0° → 42° (showing 3/4 front view)
    const p1Ratio = mapRange(scrollProgress, P1_START, P1_END, 0, 1);
    const p2Ratio = mapRange(scrollProgress, P2_START, P2_END, 0, 1);
    const p3Ratio = mapRange(scrollProgress, P3_START, P3_END, 0, 1);

    let rotateY = 0;
    let rotateX = 2;

    if (phase === 'wireframe') {
      rotateY = easeInOut(p1Ratio) * 42;
      rotateX = 2 + easeInOut(p1Ratio) * 6;
    } else if (phase === 'cinematic') {
      // Continues sweep: 42° → −42° (full pass)
      rotateY = 42 - easeInOut(p2Ratio) * 84;
      rotateX = 8 - easeInOut(p2Ratio) * 6;
    } else if (phase === 'final') {
      // Return to profile: -42° → 0°
      rotateY = -42 + easeInOut(p3Ratio) * 42;
      rotateX = 2;
    }

    // ── Shading transition ────────────────────────────────────────────────────
    // Transitions from wireframe to shaded over a short window at start of phase 2
    const shadingProgress = clamp(
      mapRange(scrollProgress, P2_START, P2_START + 0.10, 0, 1),
      0, 1
    );

    // ── Environment progression ───────────────────────────────────────────────
    // blueprint → stratosphere → edge-of-space → reentry heat, over phase 2
    const envProgress = phase === 'cinematic'
      ? easeInOut(p2Ratio)
      : phase === 'final'
        ? 1 - easeInOut(p3Ratio)  // fades back out
        : 0;

    // Reentry ramps in late-cinematic, then fades back out as we cross into
    // the final phase so the closing scene returns to the cool dark base.
    const reentryRamp = clamp(
      mapRange(scrollProgress, P2_START + 0.18, P2_END - 0.06, 0, 1),
      0, 1
    );
    const reentryFadeOut = 1 - clamp(
      mapRange(scrollProgress, P3_START, P3_START + 0.04, 0, 1),
      0, 1
    );
    const reentryProgress = reentryRamp * reentryFadeOut;

    // ── Per-annotation visibility ─────────────────────────────────────────────
    // Annotations appear at staggered scroll positions within Phase 1
    // and all fade out entering Phase 2
    const ANN_WINDOWS = [
      [P1_START + 0.02, P1_START + 0.09],   // cockpit
      [P1_START + 0.07, P1_START + 0.15],   // thermal skin
      [P1_START + 0.14, P1_START + 0.22],   // scramjet engine
      [P1_START + 0.22, P1_START + 0.30],   // vertical fin
      [P1_START + 0.30, P2_START],           // ventral intake
    ];
    const ANN_HIDE = P2_START + 0.04;

    const annotationProgress = ANN_WINDOWS.map(([start, peak]) => {
      const fadeIn  = clamp(mapRange(scrollProgress, start, peak, 0, 1), 0, 1);
      const fadeOut = 1 - clamp(mapRange(scrollProgress, P2_START, ANN_HIDE, 0, 1), 0, 1);
      return easeOut(fadeIn) * fadeOut;
    });

    const speedStreaks = phase === 'cinematic' && p2Ratio > 0.15;

    setState({
      scrollProgress,
      phase,
      rotateY,
      rotateX,
      shadingProgress,
      envProgress,
      reentryProgress,
      annotationProgress,
      speedStreaks,
    });
  }, []);

  useEffect(() => {
    const onScroll = () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(compute);
    };
    const onResize = () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(compute);
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize);

    // Seed across multiple frames so document.scrollHeight reflects the
    // final layout (after web fonts and images settle).
    compute();
    const seed = requestAnimationFrame(() => {
      compute();
      requestAnimationFrame(compute);
    });

    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
      cancelAnimationFrame(seed);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [compute]);

  return state;
}

export { easeInOut, easeOut, clamp, mapRange };
