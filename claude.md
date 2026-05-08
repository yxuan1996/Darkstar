# Darkstar

## Objective

Build a single-page React website (deployable to GitHub Pages) that showcases a futuristic hypersonic aircraft inspired by Darkstar hypersonic aircraft from Top Gun: Maverick. 

Key Goal Create a cinematic, scroll-driven storytelling experience that feels like:

- A blend of aerospace engineering UI
- A high-budget movie intro
- A futuristic product reveal The interaction should feel smooth, immersive, and cool — not cluttered.


## Requirements

- React (Vite or CRA)
- 3D model in Three.js
- Tailwind CSS (or CSS modules) for styling
- Must be fully responsive (desktop-first, graceful mobile fallback)
- Use a modular architecture for easier understanding and debugging
- Optimized for GitHub Pages deployment (static build, relative paths) 

## Design Direction
Theme: Dark, futuristic, high-performance aerospace UI

Color Palette:
- Background: Deep black / dark navy
- Accents: Neon blue, cyan, subtle orange highlights
- Text: White / light gray

Style:
- Engineering + sci-fi HUD (heads-up display)
- Glass panels, subtle glow, grid overlays
- Minimal but cinematic

Typography:
- Thin, modern sans-serif (tech aesthetic) 

✈️ Core Experience Concept
Initial State (Hero Section)
Display left side profile of the aircraft
Style: wireframe / blueprint / engineering schematic
Slight glowing lines, subtle animated scanlines
Background: faint grid or blueprint texture

Add minimal intro text:
“Darkstar Hypersonic Platform”
“Mach 10 Capable Reconnaissance Aircraft”

Scroll-Based Orbital Animation (Phase 1 – Wireframe)
As user scrolls:
The aircraft rotates smoothly in an orbital motion (~45° tilt)
Use Anime.js tied to scroll position (not just time-based)
Maintain wireframe style during this phase
Introduce dynamic annotation labels:
Boxes + connecting lines pointing to parts of the aircraft

Labels should:
Fade/slide in when relevant
Fade out when leaving section
Example annotations:
“Scramjet Engine – Designed to sustain Mach 10 speeds”
“Thermal-resistant composite skin”
“Advanced cockpit pressure shielding”
Lines should animate (draw-in effect)

Scroll-Based Orbital Animation (Phase 2 – Cinematic Mode)
After one full orbital rotation:
Transition aircraft from wireframe → fully shaded model
Add lighting and reflections
Background transitions through environments:
High-altitude stratosphere
Edge of space (dark blue → black gradient)
Atmospheric re-entry glow
Subtle motion effects:
Heat distortion
Speed lines
Particle streaks
Continue orbital motion during this phase

Final State (Closing Section)
Return aircraft to:
Left side profile
Clean, minimal presentation
Background returns to dark static theme
Add final text:
 
“Pushing the boundaries of hypersonic flight”
Optional CTA: “Explore More” or “View Engineering Specs” 

🎞️ Animation Requirements (Anime.js)

Scroll-driven animations (use scroll position mapping)
Smooth interpolation (easeInOut, cubic bezier)
Layered animations:
Rotation (3D transform illusion using CSS)
Opacity transitions
Line drawing (stroke-dashoffset technique)
Avoid jank: optimize with requestAnimationFrame or efficient scroll listeners 

🧩 Component Structure
HeroSection
AircraftCanvas (main animated component)
AnnotationLayer
EnvironmentTransitionLayer
FinalSection 

⚙️ Additional Features
Parallax depth effect between:
Aircraft
Background
UI overlays
Optional:
Mouse movement adds subtle tilt/parallax
Performance optimized:
 
## Deployment Requirements

Must build with:
```
npm run build
```

Deployable to GitHub Pages
 
- Use relative asset paths
- Include instructions for gh-pages deployment

---

## Implementation Updates

A running summary of changes made on top of the first draft. **All shell commands assume Windows CMD (cmd.exe), not PowerShell.**

### Architecture decisions

- **Persistent aircraft canvas.** `AircraftCanvas` is rendered once at the App root as a `position: fixed; inset: 0; z-index: 1` layer, so the 3D model stays visible behind every section (Hero, scroll runway, Final) instead of disappearing when the user scrolls past the middle section.
- **Full-page scroll drives animation.** `useScrollAnimation` (no longer takes a container ref) computes `scrollProgress` against `document.documentElement.scrollHeight`. Phase boundaries are calibrated for the Hero(100vh) + ScrollSection(520vh) + Final(100vh) layout:
  - `0.00 → 0.16` hero (left profile, static wireframe)
  - `0.16 → 0.55` wireframe (orbital sweep + annotations)
  - `0.55 → 0.84` cinematic (shaded + dusk environment)
  - `0.84 → 1.00` final (return to left profile, dark base)
- **Stable Three.js RAF loop.** `ThreeScene.jsx` uses a `propsRef`/`useEffect([])` pattern — the animation loop is built once and reads the latest scroll-driven props each frame, instead of being torn down and rebuilt on every scroll tick.
- **Dev observability.** `App.jsx` exposes `window.__DARKSTAR_STATE = animState` while `import.meta.env.DEV` is true, so Playwright tooling can sample `rotateY`, `phase`, etc.

### Hero section

- **Single centred banner** overlaid on the aircraft. Section uses `flex-direction: column; justify-content: center; align-items: center` so the banner sits at viewport mid-line with the aircraft directly behind it.
- Banner contents (vertical stack, all centre-aligned): badge → DARKSTAR title (`clamp(48,7vw,96)px`, `letter-spacing: 0.06em`, `white-space: nowrap`) → Hypersonic Platform tagline → cyan separator → four specs in a wrapping horizontal row → SCROLL TO EXPLORE.
- Frosted-glass chrome: `backdrop-filter: blur(22px) saturate(135%)`, `rgba(8,14,28,0.62)` fill, 1px cyan border, top accent gradient, four 14×14 corner brackets, drop shadow `0 24px 80px rgba(0,8,20,0.5)`. Banner width `min(900px, calc(100vw - 48px))`.
- High-contrast colours against the glass — labels `#7fcfe8`, values pure white with 1px text shadow, "Hypersonic Platform" `#7fe8ff` with cyan glow, badge `#ffae8a`.
- **Whole-banner fade.** App passes `scrollProgress` into `HeroSection`. Banner opacity `= 1 - scrollProgress / 0.16`, clamped to `[0,1]` — banner reaches **0 exactly at the wireframe phase boundary**, fully revealing the aircraft as the orbital sweep begins. `pointer-events` flip off once the banner is effectively gone.
- **Navigation chrome** carries a permanent dark backdrop (`rgba(5,10,20,0.55)` + `blur(14px)`, deepens to `0.85` once scrolled) so the top of the page reads cohesively even before the user scrolls.

### Aircraft + camera

- **Starts on the left side profile.** Initial camera position `(-14, 2.5, 0)`. Orbit math adds a −90° offset (`orbitAngle = degToRad(-rotateY - 90)`) so `rotateY = 0` maps to the −X axis. Across the scroll the camera sweeps left → left-back (wireframe) → through left → left-front (cinematic) → back to left (final).
- **Annotation anchors** re-authored for the mirrored layout (nose right, tail left): cockpit / skin upper-right and centre-top, fins / scramjet on the left, intake centre-bottom.

### Cinematic backdrop and lighting

- **Dusk sky held for the full cinematic phase.** A 4×512 `CanvasTexture` vertical gradient (deep night → indigo → magenta → orange → warm horizon) is built once at init and swapped into `scene.background` while `phase === 'cinematic'` (no reentry cutoff — the boundary-layer moment now silhouettes against dusk instead of dropping into a dark red wash).
- **Reentry fade-out.** `reentryProgress` ramps in late-cinematic and back to 0 over the first 4% of the final phase, so the closing scene returns to the cool dark base instead of staying tinted red.
- **Heat light tamed.** Peak intensity `4 → 1.8`, colours softened from `0xff2200/0xff6600` to `0xff5022/0xff7733`, so reentry reads as a warm accent on the airframe rather than overwhelming it against the dusk sky.
- **Fog flattened.** `scene.fog.density = 0.005` for the entire cinematic phase (no reentry-driven thickening) so the silhouette stays crisp at the boundary-layer moment.
- **Lighting.** Ambient lifted to `0.85` (`#2a4068`); cyan rim to `1.6` (`#40c8ff`). In cinematic, ambient/rim get an additional boost and two new lights fade in: `warmRim` (directional `#ff7544`, back-left) and `duskTop` (directional `#7a5fa0`, top-side). Both damp as `reentryProgress` rises.
- **Material env reflections.** Per-frame `envMapIntensity` on the shaded group: `1.5 → 2.6` while in cinematic, so the dusk gradient bounces off the high-metalness body panels.

### HUD overlays

- HUD wrapper dimming uses `filter: brightness(0.55)` instead of `opacity` (avoids compounding alpha with descendant text colours).
- `.hud-panel` background `rgba(2,8,18,0.78)`, border `rgba(0,212,255,0.45)`, label text alphas raised to `rgba(120,220,240,0.85)`.
- All HUD overlays (Telemetry, Compass, Thermal Warning, Phase Label) fade to `opacity: 0` when `phase === 'final'` so the closing copy reads cleanly.

### Final section

- Section background is transparent (canvas shows through). A vertical dimmer (`rgba(5,10,20,0.85)` top → `0.55` mid-band → `0.92` bottom) keeps the centred closing copy legible while the aircraft remains visible across the middle of the frame.

### Tooling and tests

- **Playwright.** `playwright.config.js` plus three regression assertions in `tests/darkstar.spec.js`:
  - A: DARKSTAR title fits a single line at 1920×1080.
  - B: `rotateY` changes by >5° between hero and `scrollY = 2.5 × innerHeight`.
  - C: `.hud-panel` opacity ≥ 0.85 past hero phase.
- **Debug scripts.**
  - `scripts/debug-capture.mjs` — multi-viewport screenshots (1920×1080 / 1440×900 / 1280×800 / 768×1024 / 390×844) at scroll percentages 0/25/50/75/100, plus `report.json` with h1 line-count and HUD-panel computed style probes.
  - `scripts/debug-flow.mjs` — 20 scroll-stepped screenshots at 1920×1080, sampling `window.__DARKSTAR_STATE` into `flow.json`.
- **npm scripts** added: `test:e2e`, `debug:capture`, `debug:flow`.
- **Ignored paths** in `.gitignore`: `debug-output/`, `debug-output-baseline/`, `test-results/`, `playwright-report/`, `playwright/.cache/`.

### Run book (CMD)

```cmd
cd /d C:\Users\sim.yi.xuan\code\Claude\Darkstar
npm install
npx playwright install chromium

:: terminal 1 — dev server
npm run dev

:: terminal 2 — capture / verify
node scripts\debug-capture.mjs
node scripts\debug-flow.mjs
npx playwright test
```
