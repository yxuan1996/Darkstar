# DARKSTAR — Hypersonic Platform Experience

A cinematic, scroll-driven single-page React website showcasing the Darkstar hypersonic aircraft from Top Gun: Maverick. Built with **React + Vite**, **Three.js**, and **Tailwind CSS**.

## Features

- **Scroll-driven 3D animation** — Three.js orbital camera sweep tied to scroll position
- **Wireframe → Shaded transition** — cross-fade from engineering schematic to cinematic shaded model
- **HUD annotation system** — line draw-in effects (stroke-dashoffset) with staggered reveal
- **Dusk environment backdrop** — vertical gradient sky held across the cinematic phase
- **Reentry heat effect** — warm lighting accent fades in late-cinematic and out at the final phase
- **HUD telemetry overlay** — Telemetry, Compass, Thermal Warning, and Phase Label panels
- **Mouse parallax** — subtle tilt responding to cursor position
- **Custom cursor** — smooth lagged cursor with glow effect

## Tech Stack

| Tech        | Role                                         |
|-------------|----------------------------------------------|
| React 18    | UI framework                                 |
| Vite        | Build tool + dev server                      |
| Three.js    | 3D model rendering, lighting, environment    |
| Tailwind CSS| Utility styling + responsive                 |
| Playwright  | End-to-end regression tests + debug capture  |

## Quick Start

All shell commands use **Windows CMD (cmd.exe)**.

```cmd
cd /d C:\Users\sim.yi.xuan\code\Claude\Darkstar-deploy
npm install
npx playwright install chromium

:: terminal 1 — dev server
npm run dev

:: terminal 2 — optional debug / verify
node scripts\debug-capture.mjs
node scripts\debug-flow.mjs
npx playwright test
```

## GitHub Pages Deployment

### Option A — Manual

```cmd
:: 1. Build
npm run build

:: 2. Deploy dist/ to GitHub Pages via gh-pages CLI
npm run deploy
```

> **Note:** In `vite.config.js`, set `base: '/your-repo-name/'` for a project page (e.g., `username.github.io/darkstar`). Leave as `'./'` for a root domain (`username.github.io`).

### Option B — GitHub Actions (CI/CD)

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npm run build
      - uses: peaceiris/actions-gh-pages@v4
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./dist
```

Then enable GitHub Pages in your repo settings → Pages → Source: `gh-pages` branch.

## Project Structure

```
darkstar-deploy/
├── index.html                          # Entry HTML
├── vite.config.js                      # Vite config (base path for GH Pages)
├── tailwind.config.js
├── postcss.config.js
├── playwright.config.js                # E2E test config
├── scripts/
│   ├── debug-capture.mjs               # Multi-viewport screenshots + report.json
│   └── debug-flow.mjs                  # 20-step scroll flow + flow.json
├── tests/
│   └── darkstar.spec.js                # Playwright regression assertions
└── src/
    ├── main.jsx                        # React root mount
    ├── App.jsx                         # Page orchestration + scroll section
    ├── index.css                       # Global styles, design tokens, animations
    ├── hooks/
    │   └── useScrollAnimation.js       # Scroll → animation state mapping
    └── components/
        ├── HeroSection.jsx             # Opening cinematic section + frosted banner
        ├── AircraftCanvas.jsx          # Persistent fixed Three.js canvas
        ├── ThreeScene.jsx              # Three.js scene, RAF loop, lighting
        ├── AnnotationLayer.jsx         # HUD callout labels + line draw-in
        ├── EnvironmentTransitionLayer.jsx  # Background environments
        └── FinalSection.jsx            # Closing section with specs
```

## Architecture

### Persistent aircraft canvas

`AircraftCanvas` is rendered once at the App root as a `position: fixed; inset: 0; z-index: 1` layer. The Three.js model stays visible behind every section (Hero, scroll runway, Final) instead of disappearing when the user scrolls past the middle section.

### Scroll phases

`useScrollAnimation` computes `scrollProgress` against `document.documentElement.scrollHeight`. Phase boundaries are calibrated for the Hero(100vh) + ScrollSection(520vh) + Final(100vh) layout:

| Range         | Phase     | Description                              |
|---------------|-----------|------------------------------------------|
| 0.00 → 0.16   | hero      | Left profile, static wireframe, banner   |
| 0.16 → 0.55   | wireframe | Orbital sweep + annotations              |
| 0.55 → 0.84   | cinematic | Shaded model + dusk environment          |
| 0.84 → 1.00   | final     | Return to left profile, dark base        |

### Stable Three.js RAF loop

`ThreeScene.jsx` uses a `propsRef`/`useEffect([])` pattern — the animation loop is built once and reads the latest scroll-driven props each frame, instead of being torn down and rebuilt on every scroll tick.

### Camera and orbit

Initial camera position `(-14, 2.5, 0)`. Orbit math adds a −90° offset (`orbitAngle = degToRad(-rotateY - 90)`) so `rotateY = 0` maps to the −X axis. Across the scroll the camera sweeps: left → left-back (wireframe) → through left → left-front (cinematic) → back to left (final).

### Cinematic backdrop and lighting

- **Dusk sky** — a 4×512 `CanvasTexture` vertical gradient (deep night → indigo → magenta → orange → warm horizon) is built once at init and swapped into `scene.background` while `phase === 'cinematic'`.
- **Reentry fade-out** — `reentryProgress` ramps in late-cinematic and back to 0 over the first 4% of the final phase.
- **Heat light** — peak intensity 1.8, colours `#ff5022` / `#ff7733`, so reentry reads as a warm accent rather than overpowering the dusk sky.
- **Fog** — `scene.fog.density = 0.005` across the cinematic phase (no reentry-driven thickening) so the silhouette stays crisp.
- **Lights** — ambient `0.85` (`#2a4068`), cyan rim `1.6` (`#40c8ff`). In cinematic, two additional lights fade in: `warmRim` (directional `#ff7544`, back-left) and `duskTop` (directional `#7a5fa0`, top-side).
- **Env reflections** — `envMapIntensity` `1.5 → 2.6` while cinematic so the dusk gradient bounces off the high-metalness body panels.

### HUD overlays

- `.hud-panel` background `rgba(2,8,18,0.78)`, border `rgba(0,212,255,0.45)`.
- Dimming via `filter: brightness(0.55)` (avoids compounding alpha with descendant text colours).
- All HUD overlays fade to `opacity: 0` when `phase === 'final'` so the closing copy reads cleanly.

### Hero section

- Frosted-glass banner: `backdrop-filter: blur(22px) saturate(135%)`, `rgba(8,14,28,0.62)` fill, 1px cyan border, four 14×14 corner brackets.
- Banner width `min(900px, calc(100vw - 48px))`.
- **Whole-banner fade** — opacity `= 1 - scrollProgress / 0.16`, reaching 0 exactly at the wireframe phase boundary.
- Navigation backdrop deepens from `rgba(5,10,20,0.55)` to `0.85` once the user scrolls.

### Final section

Section background is transparent (canvas shows through). A vertical dimmer (`rgba(5,10,20,0.85)` top → `0.55` mid-band → `0.92` bottom) keeps the closing copy legible while the aircraft remains visible.

### Dev observability

`App.jsx` exposes `window.__DARKSTAR_STATE = animState` while `import.meta.env.DEV` is true, so Playwright tooling can sample `rotateY`, `phase`, etc.

## Customization

### Change scroll section height
In `App.jsx`, adjust the `ScrollSection` height (`520vh`) to control how long the animation phases last.

### Tweak animation phases
In `src/hooks/useScrollAnimation.js`, adjust the phase boundary constants (`0.16`, `0.55`, `0.84`).

### Modify annotations
In `src/components/AnnotationLayer.jsx`, edit the `ANNOTATIONS` array. Anchors are expressed as normalized positions on the aircraft model (nose right, tail left layout).

### Colors
All color tokens live in `src/index.css` under `:root { ... }`.

## Testing and Debug Scripts

| npm script       | Description                                                             |
|------------------|-------------------------------------------------------------------------|
| `test:e2e`       | Run Playwright regression suite                                         |
| `debug:capture`  | Multi-viewport screenshots at 0/25/50/75/100% scroll + `report.json`   |
| `debug:flow`     | 20 scroll-stepped screenshots + `flow.json` with `__DARKSTAR_STATE`     |

### Playwright regression assertions

- **A** — DARKSTAR title fits a single line at 1920×1080.
- **B** — `rotateY` changes by >5° between hero and `scrollY = 2.5 × innerHeight`.
- **C** — `.hud-panel` opacity ≥ 0.85 past hero phase.

Debug outputs are git-ignored: `debug-output/`, `debug-output-baseline/`, `test-results/`, `playwright-report/`, `playwright/.cache/`.

## Responsive

- Desktop-first design (1440px reference)
- Graceful mobile fallback — aircraft scales down, annotations hide on small screens
- Navigation collapses on mobile

## Performance Notes

- Three.js RAF loop is built once; props are read via ref each frame (no re-instantiation on scroll)
- Scroll listener uses `requestAnimationFrame` debouncing
- `CanvasTexture` sky gradient built once at init
- Heavy overlay layers only render when phase is active
