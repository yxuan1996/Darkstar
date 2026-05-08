import React from 'react';
import ThreeScene from './ThreeScene.jsx';

/**
 * AircraftCanvas
 * Houses the Three.js 3D scene and overlays HUD telemetry panels.
 */
const AircraftCanvas = ({
  rotateY = 0,
  rotateX = 2,
  shadingProgress = 0,
  envProgress = 0,
  reentryProgress = 0,
  annotationProgress = [],
  speedStreaks = false,
  phase = 'hero',
  scrollProgress = 0,
}) => {
  const mach = phase === 'cinematic'
    ? (3.4 + envProgress * 6.8).toFixed(1)
    : phase === 'wireframe'
      ? (0.8 + scrollProgress * 10).toFixed(1)
      : '0.0';

  const altitude = phase === 'cinematic'
    ? Math.floor(71200 + envProgress * 48800).toLocaleString()
    : phase === 'wireframe'
      ? Math.floor(scrollProgress * 71200).toLocaleString()
      : '0';

  const hudData = [
    { label: 'VELOCITY',  value: `MACH ${mach}` },
    { label: 'ALTITUDE',  value: `${altitude} FT` },
    { label: 'HEADING',   value: `${(270 + rotateY).toFixed(0)}°` },
    { label: 'STATUS',    value: phase === 'cinematic' ? 'CRUISE' : phase === 'wireframe' ? 'CLIMB' : phase === 'final' ? 'RTB' : 'STANDBY' },
  ];

  // Anchor points calibrated for the left-side profile view: aircraft nose
  // appears on the right of screen, tail on the left.
  const annotations = [
    { id: 'cockpit',  label: 'PRESSURE-SEALED COCKPIT', detail: 'G-force compensated retinal HUD', x: '72%', y: '38%' },
    { id: 'skin',     label: 'THERMAL COMPOSITE SKIN',  detail: 'Ti-ceramic matrix · 2,200 °F rated', x: '50%', y: '26%' },
    { id: 'scramjet', label: 'SCRAMJET PROPULSION',      detail: 'Dual-mode sustaining Mach 10+', x: '24%', y: '56%' },
    { id: 'fin',      label: 'CANTED VERTICAL FINS',     detail: 'Hypersonic directional stability', x: '32%', y: '30%' },
    { id: 'intake',   label: 'VENTRAL AIR INTAKE',       detail: 'Variable-geometry compression', x: '50%', y: '68%' },
  ];

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
      <ThreeScene
        rotateY={rotateY}
        rotateX={rotateX}
        shadingProgress={shadingProgress}
        envProgress={envProgress}
        reentryProgress={reentryProgress}
        speedStreaks={speedStreaks}
        phase={phase}
        scrollProgress={scrollProgress}
      />

      {/* Scanlines */}
      <div className="scanlines" style={{ position: 'absolute', inset: 0, zIndex: 15, pointerEvents: 'none' }} />
      <div className="scanline-sweep" style={{ position: 'absolute', inset: 0, zIndex: 15, pointerEvents: 'none' }} />

      {/* Annotations (Phase 1 only) */}
      {annotations.map((ann, i) => {
        const progress = annotationProgress[i] ?? 0;
        if (progress < 0.05) return null;
        return (
          <div key={ann.id} style={{
            position: 'absolute', left: ann.x, top: ann.y,
            transform: 'translate(-50%, -50%)',
            opacity: progress, transition: 'opacity 0.15s linear',
            zIndex: 20, pointerEvents: 'none',
          }}>
            <div className="annotation-dot" style={{
              position: 'absolute', top: '50%', left: '50%',
              transform: 'translate(-50%, -50%)',
            }} />
            <svg style={{ position: 'absolute', top: '50%', left: '50%', overflow: 'visible', pointerEvents: 'none' }}
              width="1" height="1">
              <line x1="0" y1="0" x2="0" y2="-35"
                stroke="rgba(0,212,255,0.5)" strokeWidth="1"
                strokeDasharray={`${progress * 35},35`} />
            </svg>
            <div className="annotation-box" style={{
              position: 'absolute', bottom: '100%', left: '50%',
              transform: `translate(-50%, -40px) translateY(${(1 - progress) * 10}px)`,
              minWidth: '180px', whiteSpace: 'nowrap',
            }}>
              <div style={{ padding: '8px 14px' }}>
                <div style={{
                  fontSize: '9px', letterSpacing: '0.18em',
                  color: 'rgba(0,212,255,0.65)', fontFamily: 'var(--font-mono)',
                  marginBottom: '3px', display: 'flex', alignItems: 'center', gap: '6px',
                }}>
                  <span style={{ width: '4px', height: '4px', background: 'rgba(0,212,255,0.8)', display: 'inline-block', flexShrink: 0 }} />
                  {ann.label}
                </div>
                <div style={{ fontSize: '10px', color: 'rgba(180,210,225,0.6)', fontFamily: 'var(--font-body)', fontWeight: 300 }}>
                  {ann.detail}
                </div>
              </div>
            </div>
          </div>
        );
      })}

      {/* HUD Telemetry — hidden in the closing section so the copy reads cleanly */}
      <div className="hud-panel hud-corner" style={{
        position: 'absolute', bottom: '5%', left: '4%',
        padding: '14px 20px', zIndex: 20,
        filter: phase === 'hero' ? 'brightness(0.55)' : 'brightness(1)',
        opacity: phase === 'final' ? 0 : 1,
        transition: 'filter 0.5s ease, opacity 0.6s ease', minWidth: 210,
      }}>
        <div style={{
          fontSize: '8px', letterSpacing: '0.25em',
          color: 'rgba(120,220,240,0.85)', fontFamily: 'var(--font-mono)',
          marginBottom: '10px', textTransform: 'uppercase',
        }}>
          DARKSTAR // DS-1 TELEMETRY
        </div>
        {hudData.map(({ label, value }) => (
          <div key={label} style={{
            display: 'flex', justifyContent: 'space-between',
            alignItems: 'baseline', gap: '24px', marginBottom: '6px',
          }}>
            <span style={{ fontSize: '9px', fontFamily: 'var(--font-mono)', color: 'rgba(120,220,240,0.85)', letterSpacing: '0.12em' }}>{label}</span>
            <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--clr-cyan)', letterSpacing: '0.05em' }}>{value}</span>
          </div>
        ))}
      </div>

      {/* Compass — hidden in the closing section */}
      <div className="hud-panel" style={{
        position: 'absolute', bottom: '5%', right: '4%',
        padding: '12px 16px', zIndex: 20,
        filter: phase === 'hero' ? 'brightness(0.55)' : 'brightness(1)',
        opacity: phase === 'final' ? 0 : 1,
        transition: 'filter 0.5s ease, opacity 0.6s ease',
      }}>
        <div style={{ fontSize: '8px', letterSpacing: '0.2em', color: 'rgba(120,220,240,0.85)', fontFamily: 'var(--font-mono)', marginBottom: '8px' }}>CAMERA ANGLE</div>
        <svg width="64" height="64" viewBox="-32 -32 64 64">
          <circle cx="0" cy="0" r="28" fill="none" stroke="rgba(0,212,255,0.15)" strokeWidth="0.8" />
          <circle cx="0" cy="0" r="20" fill="none" stroke="rgba(0,212,255,0.08)" strokeWidth="0.5" strokeDasharray="4,3" />
          {[0, 90, 180, 270].map(a => {
            const r = a * Math.PI / 180;
            return <line key={a} x1={Math.sin(r) * 22} y1={-Math.cos(r) * 22} x2={Math.sin(r) * 28} y2={-Math.cos(r) * 28} stroke="rgba(0,180,255,0.22)" strokeWidth="1" />;
          })}
          <g transform={`rotate(${rotateY})`}>
            <polygon points="0,-12 5,6 0,2 -5,6" fill="rgba(0,212,255,0.7)" stroke="rgba(0,212,255,0.3)" strokeWidth="0.5" />
          </g>
          <circle cx="0" cy="0" r="2" fill="rgba(0,212,255,0.35)" />
        </svg>
        <div style={{ textAlign: 'center', fontSize: '9px', fontFamily: 'var(--font-mono)', color: 'rgba(120,220,240,0.85)', marginTop: '4px' }}>{rotateY.toFixed(0)}°</div>
      </div>

      {/* Phase label — hidden in hero (pre-flight) and final (closing copy) */}
      <div style={{
        position: 'absolute', top: '4%', left: '50%',
        transform: 'translateX(-50%)', zIndex: 20, textAlign: 'center',
        fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.3em',
        color: 'rgba(0,200,255,0.4)', textTransform: 'uppercase',
        opacity: (phase === 'hero' || phase === 'final') ? 0 : 1,
        transition: 'opacity 0.5s ease',
        pointerEvents: 'none',
      }}>
        {phase === 'wireframe' && '▸ PHASE 01 // STRUCTURAL ANALYSIS'}
        {phase === 'cinematic' && '▸ PHASE 02 // FLIGHT SIMULATION'}
      </div>

      {/* Reentry warning — never shown in the closing section */}
      {reentryProgress > 0.15 && phase !== 'final' && (
        <div style={{ position: 'absolute', top: '12%', right: '4%', zIndex: 20, opacity: Math.min(1, (reentryProgress - 0.15) * 2) }}>
          <div className="hud-panel" style={{ padding: '10px 16px' }}>
            <div style={{ fontSize: '8px', letterSpacing: '0.2em', color: 'rgba(255,107,53,0.8)', fontFamily: 'var(--font-mono)', marginBottom: '3px' }}>⚠ THERMAL WARNING</div>
            <div style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: '#ff6b35' }}>BOUNDARY LAYER</div>
            <div style={{ fontSize: '9px', fontFamily: 'var(--font-mono)', color: 'rgba(255,107,53,0.55)', marginTop: '2px' }}>{(reentryProgress * 2180).toFixed(0)} °F</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AircraftCanvas;
