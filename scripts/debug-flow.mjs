// Scroll-flow capture for Darkstar UI debug — verifies Issue B (orbital animation).
// Steps through 20 scroll positions at 1920×1080, screenshots each, samples
// window.__DARKSTAR_STATE (set by App.jsx in dev), writes flow.json.
//
// Run: npm run dev          (dev server on :5173)
//      npm run debug:flow

import { chromium } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT  = path.join(ROOT, 'debug-output');

const URL = process.env.DARKSTAR_URL || 'http://localhost:5173/';
const STEPS = 20;

(async () => {
  await fs.mkdir(OUT, { recursive: true });

  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const page = await ctx.newPage();

  page.on('pageerror', (e) => console.warn('[pageerror]', e.message));
  page.on('console', (msg) => {
    const t = msg.type();
    if (t === 'error' || t === 'warning') console.log(`[browser ${t}]`, msg.text());
  });

  await page.goto(URL, { waitUntil: 'load' });
  await page.waitForFunction(
    () => !!document.querySelector('h1') && /DARKSTAR/.test(document.querySelector('h1').textContent || ''),
    null,
    { timeout: 10_000 },
  );
  await page.waitForTimeout(800);

  const max = await page.evaluate(() => document.documentElement.scrollHeight - window.innerHeight);
  console.log(`scroll range: 0 → ${max}px (steps=${STEPS})`);

  const flow = [];
  for (let i = 0; i <= STEPS; i++) {
    const ratio = i / STEPS;
    const y = Math.round(max * ratio);
    await page.evaluate((y) => window.scrollTo(0, y), y);
    await page.waitForTimeout(400);

    const state = await page.evaluate(() => {
      const s = window.__DARKSTAR_STATE || null;
      if (!s) return null;
      // Flatten so JSON is small/easy to read.
      return {
        phase: s.phase,
        scrollProgress: s.scrollProgress,
        rotateY: s.rotateY,
        rotateX: s.rotateX,
        shadingProgress: s.shadingProgress,
        envProgress: s.envProgress,
        reentryProgress: s.reentryProgress,
        speedStreaks: s.speedStreaks,
      };
    });

    const stepStr = String(i).padStart(2, '0');
    const file = path.join(OUT, `flow_${stepStr}.png`);
    await page.screenshot({ path: file, fullPage: false });

    const row = { step: i, scrollY: y, screenshot: path.basename(file), state };
    flow.push(row);
    const sShort = state
      ? `phase=${state.phase} rotY=${state.rotateY?.toFixed?.(1)} shade=${state.shadingProgress?.toFixed?.(2)}`
      : 'state=NULL (window.__DARKSTAR_STATE missing — is dev mode on?)';
    console.log(`  ${stepStr}  y=${y}  ${sShort}`);
  }

  // Smoke checks (printed only — not assertions; tests/darkstar.spec.js gates correctness).
  const haveState = flow.every((f) => f.state);
  if (!haveState) {
    console.warn('\n⚠  window.__DARKSTAR_STATE was not exposed. Confirm import.meta.env.DEV=true and the App.jsx hook is in place.');
  } else {
    const rotYs = flow.map((f) => f.state.rotateY ?? 0);
    const peakY = Math.max(...rotYs.map(Math.abs));
    console.log(`\nrotateY peak |${peakY.toFixed(2)}|°  ${peakY < 1 ? '⚠  STUCK NEAR 0 — bug is in useScrollAnimation' : 'OK'}`);
    const phases = new Set(flow.map((f) => f.state.phase));
    console.log(`phases seen: ${[...phases].join(', ')}`);
  }

  await fs.writeFile(path.join(OUT, 'flow.json'), JSON.stringify(flow, null, 2));
  console.log(`\nFlow log → ${path.join(OUT, 'flow.json')}`);

  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
