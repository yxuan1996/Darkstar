import React, { useRef, useEffect, useState } from 'react';
import HeroSection from './components/HeroSection.jsx';
import AircraftCanvas from './components/AircraftCanvas.jsx';
import FinalSection from './components/FinalSection.jsx';
import { useScrollAnimation } from './hooks/useScrollAnimation.js';

// ─── Custom cursor ────────────────────────────────────────────────────────────
function CustomCursor() {
  const cursorRef = useRef(null);
  const pos = useRef({ x: -100, y: -100 });
  const target = useRef({ x: -100, y: -100 });

  useEffect(() => {
    const onMove = (e) => {
      target.current = { x: e.clientX, y: e.clientY };
    };
    window.addEventListener('mousemove', onMove, { passive: true });

    let raf;
    const lerp = (a, b, t) => a + (b - a) * t;
    const tick = () => {
      pos.current.x = lerp(pos.current.x, target.current.x, 0.12);
      pos.current.y = lerp(pos.current.y, target.current.y, 0.12);
      if (cursorRef.current) {
        cursorRef.current.style.transform =
          `translate(${pos.current.x - 8}px, ${pos.current.y - 8}px)`;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener('mousemove', onMove);
      cancelAnimationFrame(raf);
    };
  }, []);

  return <div ref={cursorRef} className="custom-cursor" aria-hidden="true" />;
}

// ─── Scroll progress bar ──────────────────────────────────────────────────────
function ScrollProgressBar({ progress }) {
  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0,
      height: '2px',
      width: `${progress * 100}%`,
      background: 'linear-gradient(90deg, rgba(0,100,200,0.6), var(--clr-cyan), rgba(0,212,255,0.3))',
      zIndex: 9998,
      pointerEvents: 'none',
      boxShadow: '0 0 8px rgba(0,212,255,0.4)',
      transition: 'width 0.05s linear',
    }} />
  );
}

// ─── Navigation ───────────────────────────────────────────────────────────────
function Navigation() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <nav style={{
      position: 'fixed',
      top: 0, left: 0, right: 0,
      zIndex: 1000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '18px max(4vw, 24px)',
      // Always carry a dark backdrop so the hero top banner directly below
      // can merge with the nav chrome — no visible seam at the top of the page.
      background: scrolled ? 'rgba(5,10,20,0.85)' : 'rgba(5,10,20,0.55)',
      backdropFilter: 'blur(14px) saturate(135%)',
      WebkitBackdropFilter: 'blur(14px) saturate(135%)',
      borderBottom: scrolled
        ? '1px solid rgba(0,212,255,0.12)'
        : '1px solid transparent',
      transition: 'background 0.4s ease, border-color 0.4s ease',
    }}>
      {/* Logo */}
      <div style={{
        fontFamily: 'var(--font-display)',
        fontSize: '18px',
        fontWeight: 700,
        letterSpacing: '0.22em',
        color: 'rgba(0,212,255,0.9)',
        textShadow: '0 0 20px rgba(0,212,255,0.3)',
        textTransform: 'uppercase',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
      }}>
        <span style={{
          width: '6px', height: '6px',
          background: 'var(--clr-cyan)',
          borderRadius: '50%',
          display: 'inline-block',
          boxShadow: '0 0 10px var(--clr-cyan)',
        }} />
        DARKSTAR
      </div>

      {/* Nav links */}
      <div style={{
        display: 'flex',
        gap: '36px',
        fontFamily: 'var(--font-mono)',
        fontSize: '9px',
        letterSpacing: '0.2em',
      }}>
        {['OVERVIEW', 'SPECS', 'MISSION'].map(item => (
          <a
            key={item}
            href="#"
            style={{
              color: 'rgba(0,180,220,0.45)',
              textDecoration: 'none',
              textTransform: 'uppercase',
              transition: 'color 0.2s ease',
            }}
            onMouseEnter={e => e.target.style.color = 'rgba(0,212,255,0.9)'}
            onMouseLeave={e => e.target.style.color = 'rgba(0,180,220,0.45)'}
          >
            {item}
          </a>
        ))}
      </div>
    </nav>
  );
}

// ─── Scroll spacer — provides scroll length for the orbital animation ─────────
// The actual aircraft canvas is rendered globally in <App> as a fixed layer
// so it remains visible behind Hero/Final too. This component just carves out
// enough scroll runway and surfaces the per-phase overlay text.
function ScrollSection({ phase, scrollProgress }) {
  return (
    <div style={{ height: '520vh', position: 'relative', pointerEvents: 'none' }}>
      <div style={{
        position: 'sticky',
        top: 0,
        height: '100vh',
        width: '100%',
        overflow: 'hidden',
      }}>
        <PhaseOverlayText phase={phase} scrollProgress={scrollProgress} />
      </div>
    </div>
  );
}

// ─── Phase-specific descriptive text (optional overlay in scroll section) ────
function PhaseOverlayText({ phase, scrollProgress }) {
  const phaseInfo = {
    wireframe: {
      title: 'STRUCTURAL ANALYSIS',
      sub: 'Examining the airframe at subsonic approach',
    },
    cinematic: {
      title: 'FLIGHT ENVELOPE',
      sub: 'Hypersonic cruise simulation active',
    },
    final: {
      title: 'MISSION PROFILE',
      sub: 'Returning to base configuration',
    },
  };

  const info = phaseInfo[phase];
  if (!info || phase === 'hero') return null;

  return (
    <div style={{
      position: 'absolute',
      top: '18%',
      left: '50%',
      transform: 'translateX(-50%)',
      textAlign: 'center',
      zIndex: 25,
      pointerEvents: 'none',
      opacity: 0.7,
    }}>
      <div style={{
        fontFamily: 'var(--font-display)',
        fontSize: 'clamp(11px, 1.8vw, 15px)',
        fontWeight: 600,
        letterSpacing: '0.3em',
        color: 'rgba(0,212,255,0.45)',
        textTransform: 'uppercase',
        marginBottom: '4px',
      }}>
        {info.title}
      </div>
      <div style={{
        fontFamily: 'var(--font-body)',
        fontSize: 'clamp(10px, 1.3vw, 12px)',
        fontWeight: 200,
        letterSpacing: '0.1em',
        color: 'rgba(160,210,230,0.35)',
      }}>
        {info.sub}
      </div>
    </div>
  );
}

// ─── App root ─────────────────────────────────────────────────────────────────
export default function App() {
  const animState = useScrollAnimation();

  // Expose live animation state in dev so Playwright debug-flow.mjs and the
  // regression spec can sample rotateY/phase/etc. from window.__DARKSTAR_STATE.
  if (import.meta.env.DEV && typeof window !== 'undefined') {
    window.__DARKSTAR_STATE = animState;
  }

  return (
    <>
      {/* Persistent aircraft canvas — fixed background, visible across all
          three sections. HUD/text content layers on top via main's z-index. */}
      <div style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1,
        pointerEvents: 'none',
      }}>
        <AircraftCanvas
          rotateY={animState.rotateY}
          rotateX={animState.rotateX}
          shadingProgress={animState.shadingProgress}
          envProgress={animState.envProgress}
          reentryProgress={animState.reentryProgress}
          annotationProgress={animState.annotationProgress}
          speedStreaks={animState.speedStreaks}
          phase={animState.phase}
          scrollProgress={animState.scrollProgress}
        />
      </div>

      {/* Global noise texture */}
      <div className="noise-overlay" aria-hidden="true" />

      {/* Custom cursor (desktop only) */}
      <CustomCursor />

      {/* Scroll progress bar */}
      <ScrollProgressBar progress={animState.scrollProgress} />

      {/* Navigation */}
      <Navigation />

      {/* Page content — sits above the fixed canvas */}
      <main style={{ position: 'relative', zIndex: 2 }}>
        <HeroSection scrollProgress={animState.scrollProgress} />
        <ScrollSection phase={animState.phase} scrollProgress={animState.scrollProgress} />
        <FinalSection />
      </main>
    </>
  );
}
