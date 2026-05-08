import React, { useEffect, useRef, useState } from 'react';
import anime from 'animejs/lib/anime.es.js';

const FinalSection = () => {
  const [visible, setVisible] = useState(false);
  const sectionRef = useRef(null);
  const contentRef = useRef(null);
  const line1Ref   = useRef(null);
  const line2Ref   = useRef(null);
  const btnRef     = useRef(null);

  // Observe when this section enters viewport
  useEffect(() => {
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !visible) {
          setVisible(true);
        }
      },
      { threshold: 0.25 }
    );
    if (sectionRef.current) obs.observe(sectionRef.current);
    return () => obs.disconnect();
  }, [visible]);

  // Animate when visible
  useEffect(() => {
    if (!visible) return;

    const tl = anime.timeline({ easing: 'easeOutCubic' });

    tl.add({
      targets: line1Ref.current,
      opacity: [0, 1],
      translateY: [30, 0],
      duration: 900,
    });

    tl.add({
      targets: line2Ref.current,
      opacity: [0, 1],
      translateY: [20, 0],
      duration: 700,
    }, '-=400');

    tl.add({
      targets: btnRef.current?.querySelectorAll('button'),
      opacity: [0, 1],
      translateY: [16, 0],
      delay: anime.stagger(140),
      duration: 600,
    }, '-=200');
  }, [visible]);

  // Specs data for the bottom grid
  const specs = [
    { label: 'LENGTH',       value: '69.0 FT',       unit: '21.0 m' },
    { label: 'WINGSPAN',     value: '34.0 FT',       unit: '10.4 m' },
    { label: 'MAX SPEED',    value: 'MACH 6+',       unit: '4,600+ MPH' },
    { label: 'SERVICE CEIL', value: '> 85,000 FT',   unit: '25,908 m' },
    { label: 'RANGE',        value: '> 3,000 NMI',   unit: '5,556 km' },
    { label: 'PROPULSION',   value: '2× ADAPTIVE',   unit: 'CYCLE ENGINES' },
  ];

  return (
    <section
      ref={sectionRef}
      style={{
        position: 'relative',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: '80px',
        paddingBottom: '80px',
        overflow: 'hidden',
        // Transparent so the persistent aircraft canvas behind the page shows through.
        background: 'transparent',
      }}
    >
      {/* Vertical dimmer — fades the aircraft toward the corners so the
          centred copy stays readable, but the plane is still clearly there. */}
      <div style={{
        position: 'absolute', inset: 0,
        background: `
          linear-gradient(180deg, rgba(5,10,20,0.85) 0%, rgba(5,10,20,0.55) 25%, rgba(5,10,20,0.55) 75%, rgba(5,10,20,0.92) 100%),
          radial-gradient(ellipse at 50% 0%, rgba(0,30,70,0.35) 0%, transparent 55%)
        `,
        pointerEvents: 'none',
      }} />

      {/* Grid background */}
      <div className="grid-bg" style={{ position: 'absolute', inset: 0, opacity: 0.4 }} />

      {/* Scanlines */}
      <div className="scanlines" style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }} />

      {/* Top separator */}
      <div style={{
        position: 'absolute',
        top: 0, left: 0, right: 0,
        height: '1px',
        background: 'linear-gradient(90deg, transparent, rgba(0,212,255,0.35) 30%, rgba(0,212,255,0.55) 60%, transparent)',
      }} />

      {/* ── Main content ─────────────────────────────────────────────────── */}
      <div ref={contentRef} style={{
        position: 'relative',
        zIndex: 10,
        textAlign: 'center',
        padding: '0 max(5vw, 24px)',
        maxWidth: '900px',
      }}>

        {/* Phase label */}
        <div style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '9px',
          letterSpacing: '0.32em',
          color: 'rgba(0,200,255,0.4)',
          marginBottom: '32px',
          textTransform: 'uppercase',
        }}>
          END TRANSMISSION // DARKSTAR DS-1
        </div>

        {/* Main closing statement */}
        <h2
          ref={line1Ref}
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(28px, 5vw, 58px)',
            fontWeight: 300,
            letterSpacing: '0.06em',
            lineHeight: 1.15,
            color: 'rgba(220,240,248,0.9)',
            marginBottom: '20px',
            opacity: 0,
          }}
        >
          Pushing the boundaries of{' '}
          <span style={{
            color: 'var(--clr-cyan)',
            fontWeight: 600,
            textShadow: '0 0 30px rgba(0,212,255,0.4)',
          }}>
            hypersonic flight
          </span>
        </h2>

        {/* Subtext */}
        <p
          ref={line2Ref}
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 'clamp(13px, 1.6vw, 16px)',
            fontWeight: 200,
            letterSpacing: '0.05em',
            color: 'rgba(160,200,220,0.55)',
            maxWidth: '520px',
            margin: '0 auto 56px',
            lineHeight: 1.7,
            opacity: 0,
          }}
        >
          Where aerospace engineering meets the boundary of the possible.
          The Darkstar hypersonic platform redefines what flight means
          at the edge of atmosphere.
        </p>

        {/* CTAs */}
        <div ref={btnRef} style={{
          display: 'flex',
          gap: '20px',
          justifyContent: 'center',
          flexWrap: 'wrap',
          marginBottom: '80px',
        }}>
          <button className="btn-hud" style={{ opacity: 0 }}>
            View Engineering Specs
          </button>
          <button className="btn-hud-secondary" style={{ opacity: 0 }}>
            Explore Program
          </button>
        </div>

        {/* ── Specs grid ───────────────────────────────────────────────── */}
        <div style={{
          borderTop: '1px solid rgba(0,212,255,0.12)',
          paddingTop: '48px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
          gap: '32px 40px',
        }}>
          {specs.map(({ label, value, unit }) => (
            <div key={label} style={{ textAlign: 'left' }}>
              <div style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '8px',
                letterSpacing: '0.2em',
                color: 'rgba(0,180,220,0.38)',
                marginBottom: '6px',
                textTransform: 'uppercase',
              }}>{label}</div>
              <div style={{
                fontFamily: 'var(--font-display)',
                fontSize: '18px',
                fontWeight: 600,
                letterSpacing: '0.04em',
                color: 'rgba(220,240,248,0.82)',
                marginBottom: '2px',
              }}>{value}</div>
              <div style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '9px',
                color: 'rgba(0,180,220,0.28)',
                letterSpacing: '0.08em',
              }}>{unit}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Bottom legal/credit strip ─────────────────────────────────── */}
      <div style={{
        position: 'absolute',
        bottom: '24px',
        left: 0, right: 0,
        textAlign: 'center',
        fontFamily: 'var(--font-mono)',
        fontSize: '8.5px',
        letterSpacing: '0.14em',
        color: 'rgba(0,150,200,0.25)',
        zIndex: 10,
      }}>
        DARKSTAR // HYPERSONIC PLATFORM // CLASSIFICATION PENDING //
        INSPIRED BY LOCKHEED SR-72 DEMONSTRATOR
      </div>

      {/* Decorative corner marks */}
      {[
        { top: '20px', left: '20px',  borderRight: 'none', borderBottom: 'none' },
        { top: '20px', right: '20px', borderLeft: 'none',  borderBottom: 'none' },
        { bottom: '20px', left: '20px',  borderRight: 'none', borderTop: 'none' },
        { bottom: '20px', right: '20px', borderLeft: 'none',  borderTop: 'none' },
      ].map((s, i) => (
        <div key={i} style={{
          position: 'absolute',
          width: '20px', height: '20px',
          border: '1px solid rgba(0,212,255,0.18)',
          ...s,
          zIndex: 10,
        }} />
      ))}
    </section>
  );
};

export default FinalSection;
