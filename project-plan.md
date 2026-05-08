# Darkstar — UI/UX Debug & Fix Plan

A Playwright-driven workflow to reproduce, capture, and fix the current visual/interaction issues. **All shell commands assume Windows CMD (cmd.exe), not PowerShell.**

---

## 0. Known Issues (entry point)

| # | Issue | Suspected cause | Where |
|---|---|---|---|
| A | "DARKSTAR" wraps — last `R` drops to a new line in full-screen desktop | `font-size: clamp(60px, 10vw, 120px)` + `letter-spacing: 0.08em` on a parent constrained to `max-width: 600px` | `src/components/HeroSection.jsx` (h1 around line 161-172) |
| B | 3D aircraft renders, but does not orbit with scroll | Likely either (a) `useScrollAnimation` not detecting scroll on the sticky/tall container, or (b) the Three.js animation loop closure capturing stale `rotateY`/`phase` props | `src/hooks/useScrollAnimation.js`, `src/components/ThreeScene.jsx` (lines 230-398) |
| C | HUD panels barely visible | `opacity` on the wrapper compounds with already-low alpha text colors (e.g. `rgba(0,180,220,0.45)`); panels also sit behind `.scanlines` / noise overlay | `src/components/AircraftCanvas.jsx` HUD blocks (lines 107-153) and `.hud-panel` in `src/index.css` |

These are the issues we will reproduce, screenshot, fix, and re-verify.

---

## 1. Tooling Setup

### 1.1 Install Playwright (one-time)

```cmd
cd /d C:\Users\sim.yi.xuan\code\Claude\Darkstar
npm install --save-dev @playwright/test
npx playwright install chromium
```

> Only Chromium is needed for screenshot debugging — skip `playwright install` (no args) to avoid pulling Firefox/WebKit.

### 1.2 Add npm scripts

Edit `package.json` and add under `scripts`:

```json
"test:e2e": "playwright test",
"debug:capture": "node scripts/debug-capture.mjs",
"debug:flow": "node scripts/debug-flow.mjs"
```

### 1.3 Folder layout

```
Darkstar/
├─ scripts/
│  ├─ debug-capture.mjs   # static multi-viewport snapshots
│  └─ debug-flow.mjs      # scroll-driven snapshot sequence
├─ tests/
│  └─ darkstar.spec.js    # Playwright assertions
└─ debug-output/          # screenshots land here (gitignored)
```

Create directories and the gitignore line in CMD:

```cmd
mkdir scripts
mkdir tests
mkdir debug-output
echo debug-output/ >> .gitignore
```

---

## 2. Debug Script #1 — Multi-Viewport Static Capture

**File:** `scripts/debug-capture.mjs`

**Goal:** screenshot the page at the top, scrolled 25/50/75/100%, across the viewports the user actually sees.

Viewports to cover:
- `1920x1080` (full-screen desktop — primary, where issue A is reported)
- `1440x900` (typical laptop)
- `1280x800` (smallest desktop)
- `768x1024` (tablet portrait — confirm responsive fallback)
- `390x844` (mobile)

Per-viewport actions:
1. `goto http://localhost:5173/`
2. Wait for `h1` containing `DARKSTAR` to be visible.
3. Screenshot full page at scrollY=0.
4. For each step in `[0.25, 0.5, 0.75, 1.0]`: scroll to `step * (scrollHeight - innerHeight)`, wait 600ms (let scroll-driven RAF settle), screenshot the viewport.
5. Save as `debug-output/{viewport}_{scrollPct}.png`.

Also emit a small `debug-output/report.json` with, per shot, `{ viewport, scrollY, h1BoundingBox, h1WrappedLines, hudPanelOpacityComputed }` derived via `page.evaluate`. This gives fast machine-readable confirmation of issue A and C without re-eyeballing every PNG.

Key probes to include in the `evaluate` block:

```js
// Issue A — does the h1 wrap?
const h1 = document.querySelector('h1');
const lineHeight = parseFloat(getComputedStyle(h1).lineHeight);
const lines = Math.round(h1.getBoundingClientRect().height / lineHeight);

// Issue C — actual rendered alpha of HUD text
const hud = document.querySelector('.hud-panel');
const cs = hud && getComputedStyle(hud);
const hudOpacity = cs?.opacity;
const hudBg = cs?.backgroundColor;
```

---

## 3. Debug Script #2 — Scroll Flow Capture (orbital animation)

**File:** `scripts/debug-flow.mjs`

**Goal:** verify Issue B — does the aircraft actually rotate as we scroll through the 520vh `ScrollSection`?

Procedure:
1. Launch at `1920x1080`.
2. Step through scrollY in **20 even increments** from 0 to `scrollHeight - innerHeight`.
3. At each step:
   - Wait 400ms for RAF + camera lerp.
   - Screenshot full viewport → `debug-output/flow_{NN}.png`.
   - Read live state from the page via `evaluate`. Easiest path: temporarily expose a debug hook in `App.jsx` or `useScrollAnimation.js` like `window.__DARKSTAR_STATE = state` (guarded by `import.meta.env.DEV`).
   - Log `{ step, scrollY, phase, rotateY, rotateX, shadingProgress }` into `debug-output/flow.json`.
4. After the run, assert:
   - `rotateY` is non-zero somewhere in the middle of the run.
   - `phase` cycles through `hero → wireframe → cinematic → final`.
   - The pixel diff between `flow_05.png` and `flow_10.png` is non-trivial (use `pixelmatch` or just file-size delta as a smoke check).

If `rotateY` stays at 0 across every sample, Issue B is confirmed in the **scroll hook**, not in Three.js. If `rotateY` varies but the canvas pixels don't change, the bug is in **`ThreeScene.jsx`** (closure / animation loop).

---

## 4. Playwright Test (regression net)

**File:** `tests/darkstar.spec.js`

Three assertions, one per known issue:

```text
test('A: DARKSTAR title fits on a single line at 1920x1080')
  → set viewport, goto /, measure h1 height vs line-height, expect 1 line.

test('B: aircraft rotates with scroll')
  → goto /, sample window.__DARKSTAR_STATE.rotateY at scrollY=0 and scrollY=2000,
    expect difference > 5 degrees.

test('C: HUD panel is legible past hero phase')
  → goto /, scroll to 30% of page height, evaluate computed opacity of
    .hud-panel and color contrast of its inner text vs background — expect
    opacity ≥ 0.85 and a minimum perceived contrast threshold.
```

These run via `npm run test:e2e` and become the gate for "fixed."

---

## 5. Fix Sequence

Work the issues in this order — each fix unblocks cleaner verification of the next.

### Issue A — title wrapping (lowest risk, fastest win)

**File:** `src/components/HeroSection.jsx`

Options, in order of preference:
1. Lower the upper bound: `clamp(60px, 8vw, 104px)`. At 1920px, `8vw = 153.6px` → still hits ceiling, so width drops from ~120 to 104px → ~13% less width per glyph.
2. Add `white-space: nowrap` to the `h1` and let `clamp` size down naturally on narrow viewports. Pair with `max-width: none` on the parent text column so the title escapes the 600px constraint, OR move the title outside the constrained `<div>` wrapping the body copy.
3. Reduce `letter-spacing` from `0.08em` → `0.04em`.

Recommended combo: **(2) + (3)** — `nowrap` on the h1, drop letter-spacing slightly. Keep the constrained column for the subtitle/meta only.

Re-run `debug-capture.mjs` — confirm the `h1WrappedLines` field equals `1` at all viewports ≥ 1280px wide.

### Issue B — orbital animation not driven by scroll

**Files:** `src/hooks/useScrollAnimation.js`, `src/components/ThreeScene.jsx`

Diagnostic order:

1. **Run `debug-flow.mjs` and inspect `flow.json` first** — this tells us whether `rotateY` is updating or stuck at 0.

2. **If `rotateY` is stuck at 0:** the bug is in `useScrollAnimation`. Most likely cause: `containerRef.current.offsetTop` returns 0 at first paint because the sticky `<HeroSection>` ahead of it hasn't fully laid out, OR the math `(scrollTop - elTop) / (elHeight - winH)` is producing negative/clamped values. Add a `console.debug` of `{ scrollTop, elTop, elHeight, raw }` and watch in Playwright via `page.on('console', ...)`. Likely fix: recompute on `resize` and on first paint after `requestAnimationFrame`, and verify `containerRef` is attached to the *scrollable* element rather than its sticky child.

3. **If `rotateY` varies but the canvas doesn't move:** the bug is in `ThreeScene.jsx`. The animation `useEffect` (line 230) depends on every prop, so on each scroll tick it tears down + rebuilds the RAF loop — wasteful, but not incorrect. The real risk: `init()` is in a separate `useEffect` and the model/scene refs are populated *after* the first animation effect runs, so the early frames bail at the `if (!camera || !model …)` guard, and the loop captured those stale refs. Fix: split into one stable RAF loop that reads props from a ref (update via a small `useEffect` that just writes `propsRef.current = { rotateY, … }`).

   Sketch:
   ```text
   const propsRef = useRef({ rotateY, rotateX, shadingProgress, ... });
   useEffect(() => { propsRef.current = { rotateY, rotateX, ... }; });
   // animation useEffect runs once, reads propsRef.current each frame.
   ```

4. Re-run `debug-flow.mjs`; confirm visible orbit and pixel delta between mid-scroll frames.

### Issue C — HUD panel visibility

**Files:** `src/components/AircraftCanvas.jsx`, `src/index.css`

Root cause: panel-level `opacity` (0.35 in hero, 0.92 elsewhere) multiplies *every* descendant's alpha. The label text already uses `rgba(0,180,220,0.45)`, so effective alpha in hero is `0.45 * 0.35 = 0.16` — invisible against a similarly-tinted background.

Fixes:
1. Stop using wrapper `opacity` for hero dimming. Replace with explicit per-element colors (full-alpha cyan text, with the *background* alpha cut down) so the text stays legible. Or animate `filter: brightness()` rather than opacity.
2. Bump the `.hud-panel` background contrast: `rgba(2, 8, 18, 0.78)` instead of `rgba(0, 20, 40, 0.6)`, plus `border-color: rgba(0,212,255,0.45)`.
3. Raise text alphas: `rgba(0,180,220,0.45)` → `rgba(120, 220, 240, 0.85)` for labels, keep the value column at full cyan.
4. Move `.scanlines` z-index below the HUD (already z-15 vs HUD z-20 — verify in DevTools that `mix-blend-mode` / `backdrop-filter` aren't fighting it).

Re-run `debug-capture.mjs`; confirm the JSON report shows wrapper opacity ≥ 0.85 past hero, and visually verify both HUD corners read cleanly across all five viewports.

---

## 6. Execution Order (run book)

```cmd
:: terminal 1 — dev server
cd /d C:\Users\sim.yi.xuan\code\Claude\Darkstar
npm run dev

:: terminal 2 — capture baseline before any fixes
cd /d C:\Users\sim.yi.xuan\code\Claude\Darkstar
node scripts\debug-capture.mjs
node scripts\debug-flow.mjs
ren debug-output debug-output-baseline
mkdir debug-output

:: apply fix A → re-capture
node scripts\debug-capture.mjs

:: apply fix B → re-capture flow
node scripts\debug-flow.mjs

:: apply fix C → final pass
node scripts\debug-capture.mjs

:: regression suite
npx playwright test
```

Compare `debug-output-baseline\` vs `debug-output\` side by side to confirm each issue resolved without regressing the others.

---

## 7. Out of scope (explicitly deferred)

- Mobile redesign of the HUD (current behavior: panels overlap on <500px — acceptable for now).
- Replacing Three.js animation with a stable RAF + props-ref pattern is **only** done if Issue B's diagnostic confirms it; we don't refactor preemptively.
- GitHub Pages deploy verification — handled separately under the existing `npm run deploy`.

---

## 8. Definition of Done

- All three Playwright assertions in `tests/darkstar.spec.js` pass.
- `debug-output/report.json` shows: `h1WrappedLines === 1` at every viewport ≥ 1280px wide; HUD opacity ≥ 0.85 past hero phase.
- `debug-output/flow.json` shows `rotateY` sweeping from 0 → ~42 → ~−42 → ~0 across the scroll range, and side-by-side flow PNGs visibly differ.
- `npm run build` completes without errors and the built `dist/` runs locally via `npm run preview` with the same behavior.
