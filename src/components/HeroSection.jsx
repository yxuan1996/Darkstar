import React, { useEffect, useRef } from 'react';
import anime from 'animejs/lib/anime.es.js';

const HeroSection = ({ scrollProgress = 0 }) => {
  const titleRef    = useRef(null);
  const subtitleRef = useRef(null);
  const metaRef     = useRef(null);
  const badgeRef    = useRef(null);

  // The whole banner fades from 1 → 0 across the hero scroll range so the
  // aircraft is fully revealed by the wireframe phase boundary (~0.16).
  const HERO_END = 0.16;
  const bannerOpacity = Math.max(0, Math.min(1, 1 - scrollProgress / HERO_END));

  useEffect(() => {
    const tl = anime.timeline({ easing: 'easeOutCubic' });

    // Badge
    tl.add({
      targets: badgeRef.current,
      opacity: [0, 1],
      translateX: [-20, 0],
      duration: 600,
    }, 400);

    // Title letters
    if (titleRef.current) {
      const letters = titleRef.current.querySelectorAll('.letter');
      tl.add({
        targets: letters,
        opacity: [0, 1],
        translateY: [30, 0],
        delay: anime.stagger(50),
        duration: 700,
        easing: 'easeOutCubic',
      }, '-=200');
    }

    // Subtitle + meta
    tl.add({
      targets: [subtitleRef.current, metaRef.current],
      opacity: [0, 1],
      translateX: [-20, 0],
      delay: anime.stagger(150),
      duration: 700,
    }, '-=300');

    return () => tl.pause();
  }, []);

  const titleLetters = 'DARKSTAR'.split('').map((char, i) => (
    <span key={i} className="letter" style={{ display: 'inline-block', opacity: 0 }}>{char}</span>
  ));

  return (
    <section style={{
      position: 'relative',
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      overflow: 'hidden',
      // Transparent so the persistent <AircraftCanvas/> in App.jsx shows through.
      background: 'transparent',
      padding: 'max(80px, 10vh) max(4vw, 24px) max(40px, 5vh)',
    }}>
      {/* Grid backgrounds */}
      <div className="grid-bg" style={{ position: 'absolute', inset: 0, zIndex: 0 }} />
      <div className="grid-bg-fine" style={{ position: 'absolute', inset: 0, zIndex: 0, opacity: 0.5 }} />

      {/* Vignette — keeps the corners atmospheric without masking the canvas centre */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(ellipse at 50% 50%, transparent 40%, rgba(5,10,20,0.7) 100%)',
        zIndex: 1, pointerEvents: 'none',
      }} />

      {/* Scanlines */}
      <div className="scanlines scanline-sweep" style={{ position: 'absolute', inset: 0, zIndex: 3, pointerEvents: 'none' }} />

      {/* ── SINGLE BANNER — overlays the aircraft, fades on scroll ─────── */}
      <div style={{
        position: 'relative',
        zIndex: 10,
        width: 'min(900px, calc(100vw - 48px))',
        background: 'rgba(8, 14, 28, 0.62)',
        border: '1px solid rgba(0, 212, 255, 0.32)',
        backdropFilter: 'blur(22px) saturate(135%)',
        WebkitBackdropFilter: 'blur(22px) saturate(135%)',
        boxShadow: '0 24px 80px rgba(0, 8, 20, 0.5)',
        padding: 'clamp(28px, 4vw, 52px) clamp(28px, 4vw, 56px) clamp(24px, 3vw, 40px)',
        textAlign: 'center',
        opacity: bannerOpacity,
        transition: 'opacity 0.08s linear',
        pointerEvents: bannerOpacity < 0.05 ? 'none' : 'auto',
      }}>
        {/* Top accent line */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: '1px',
          background: 'linear-gradient(90deg, rgba(0,212,255,0.85) 0%, rgba(0,212,255,0.25) 50%, rgba(0,212,255,0.85) 100%)',
          pointerEvents: 'none',
        }} />
        {/* HUD corner brackets */}
        <div style={{ position: 'absolute', top: -1, left: -1, width: 14, height: 14, borderTop: '2px solid var(--clr-cyan)', borderLeft: '2px solid var(--clr-cyan)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: -1, right: -1, width: 14, height: 14, borderTop: '2px solid var(--clr-cyan)', borderRight: '2px solid var(--clr-cyan)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: -1, left: -1, width: 14, height: 14, borderBottom: '2px solid var(--clr-cyan)', borderLeft: '2px solid var(--clr-cyan)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: -1, right: -1, width: 14, height: 14, borderBottom: '2px solid var(--clr-cyan)', borderRight: '2px solid var(--clr-cyan)', pointerEvents: 'none' }} />

        {/* Classification badge */}
        <div ref={badgeRef} style={{
          marginBottom: '14px',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px',
          opacity: 0,
        }}>
          <div style={{
            width: '7px', height: '7px',
            background: '#ff6b35', borderRadius: '50%',
            boxShadow: '0 0 10px rgba(255,107,53,0.7)',
            animation: 'pulseDot 2s ease-in-out infinite',
          }} />
          <span style={{
            fontFamily: 'var(--font-mono)', fontSize: '11px',
            letterSpacing: '0.28em', color: '#ffae8a',
            textTransform: 'uppercase', fontWeight: 500,
          }}>CLASSIFIED // COMPARTMENTALIZED</span>
        </div>

        {/* DARKSTAR title */}
        <h1 ref={titleRef} style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(48px, 7vw, 96px)',
          fontWeight: 700,
          letterSpacing: '0.06em',
          lineHeight: 0.95,
          color: '#ffffff',
          textShadow: '0 0 60px rgba(0,212,255,0.3), 0 2px 4px rgba(0,0,0,0.5)',
          margin: 0,
          whiteSpace: 'nowrap',
        }}>
          {titleLetters}
        </h1>

        {/* Hypersonic platform info */}
        <div ref={subtitleRef} style={{ opacity: 0, marginTop: 'clamp(18px, 2.4vw, 28px)' }}>
          <p style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(15px, 1.8vw, 21px)',
            fontWeight: 500, letterSpacing: '0.28em',
            color: '#7fe8ff',
            textTransform: 'uppercase',
            marginBottom: '6px',
            textShadow: '0 0 18px rgba(0,212,255,0.5)',
          }}>
            Hypersonic Platform
          </p>
          <p style={{
            fontFamily: 'var(--font-body)',
            fontSize: 'clamp(13px, 1.3vw, 15px)',
            fontWeight: 300, letterSpacing: '0.04em',
            color: '#dbeaf2',
            margin: 0,
            lineHeight: 1.5,
          }}>
            Mach 10 Capable Reconnaissance Aircraft
          </p>
        </div>

        {/* Specs row + scroll prompt */}
        <div ref={metaRef} style={{ opacity: 0, marginTop: 'clamp(20px, 2.6vw, 32px)' }}>
          {/* Cyan separator */}
          <div style={{
            height: '1px',
            background: 'linear-gradient(90deg, transparent 0%, rgba(0,212,255,0.5) 50%, transparent 100%)',
            marginBottom: 'clamp(18px, 2.2vw, 26px)',
          }} />

          {/* Specs (horizontal row, wraps on mobile) */}
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 'clamp(12px, 1.8vw, 24px) clamp(20px, 3vw, 44px)',
            justifyContent: 'center',
            marginBottom: 'clamp(18px, 2.4vw, 28px)',
          }}>
            {[
              ['DESIGNATION', 'DS-1 DARKSTAR'],
              ['MAX SPEED',   'MACH 10.2'],
              ['CEILING',     '85,000 FT'],
              ['PROPULSION',  '2× ADAPTIVE CYCLE'],
            ].map(([label, val]) => (
              <div key={label}>
                <div style={{
                  fontFamily: 'var(--font-mono)', fontSize: '10px',
                  letterSpacing: '0.22em', color: '#7fcfe8',
                  marginBottom: '4px', fontWeight: 500,
                }}>{label}</div>
                <div style={{
                  fontFamily: 'var(--font-display)', fontSize: 'clamp(14px, 1.4vw, 17px)',
                  fontWeight: 600, letterSpacing: '0.08em',
                  color: '#ffffff',
                  textShadow: '0 1px 3px rgba(0,0,0,0.4)',
                  whiteSpace: 'nowrap',
                }}>{val}</div>
              </div>
            ))}
          </div>

          {/* Scroll indicator */}
          <div className="scroll-indicator" style={{ alignItems: 'center' }}>
            <span style={{
              fontFamily: 'var(--font-mono)', fontSize: '11px',
              letterSpacing: '0.32em', color: '#7fcfe8',
              marginBottom: '4px', fontWeight: 500,
            }}>SCROLL TO EXPLORE</span>
            <div className="scroll-indicator-line" />
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
