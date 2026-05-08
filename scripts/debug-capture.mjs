// Multi-viewport static capture for Darkstar UI debug.
// Screenshots the dev server at 5 viewport sizes × 5 scroll positions and
// emits debug-output/report.json with quick probes for issues A and C.
//
// Run: npm run dev   (in another terminal, dev server on :5173)
//      npm run debug:capture

import { chromium } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT  = path.join(ROOT, 'debug-output');

const URL = process.env.DARKSTAR_URL || 'http://localhost:5173/';

const VIEWPORTS = [
  { name: '1920x1080', width: 1920, height: 1080 },
  { name: '1440x900',  width: 1440, height: 900  },
  { name: '1280x800',  width: 1280, height: 800  },
  { name: '768x1024',  width: 768,  height: 1024 },
  { name: '390x844',   width: 390,  height: 844  },
];

const SCROLL_STEPS = [0, 0.25, 0.5, 0.75, 1.0];

async function ensureDir(d) {
  await fs.mkdir(d, { recursive: true });
}

async function probe(page) {
  return page.evaluate(() => {
    const h1 = document.querySelector('h1');
    let h1WrappedLines = null;
    let h1BoundingBox = null;
    if (h1) {
      const cs = getComputedStyle(h1);
      const lh = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.2;
      const rect = h1.getBoundingClientRect();
      h1BoundingBox = { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
      h1WrappedLines = lh > 0 ? Math.round(rect.height / lh) : null;
    }

    const hud = document.querySelector('.hud-panel');
    let hudOpacityComputed = null;
    let hudBg = null;
    if (hud) {
      const cs = getComputedStyle(hud);
      hudOpacityComputed = cs.opacity;
      hudBg = cs.backgroundColor;
    }

    return {
      scrollY: window.scrollY,
      docHeight: document.documentElement.scrollHeight,
      innerHeight: window.innerHeight,
      h1BoundingBox,
      h1WrappedLines,
      hudOpacityComputed,
      hudBg,
    };
  });
}

(async () => {
  await ensureDir(OUT);

  const browser = await chromium.launch();
  const report = [];

  for (const vp of VIEWPORTS) {
    console.log(`\n— viewport ${vp.name} —`);
    const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
    const page = await ctx.newPage();

    page.on('pageerror', (e) => console.warn(`[pageerror @ ${vp.name}]`, e.message));

    await page.goto(URL, { waitUntil: 'load' });
    // Wait for the DARKSTAR title.
    await page.waitForFunction(
      () => !!document.querySelector('h1') && /DARKSTAR/.test(document.querySelector('h1').textContent || ''),
      null,
      { timeout: 10_000 },
    );
    // Let scroll-RAF + anime.js intro settle.
    await page.waitForTimeout(800);

    for (const step of SCROLL_STEPS) {
      const max = await page.evaluate(() => document.documentElement.scrollHeight - window.innerHeight);
      const targetY = Math.round(max * step);
      await page.evaluate((y) => window.scrollTo(0, y), targetY);
      await page.waitForTimeout(600);

      const pct = String(Math.round(step * 100)).padStart(3, '0');
      const file = path.join(OUT, `${vp.name}_${pct}.png`);
      await page.screenshot({ path: file, fullPage: false });
      const probed = await probe(page);
      report.push({ viewport: vp.name, scrollPct: step, screenshot: path.basename(file), ...probed });
      console.log(`  ${pct}%  scrollY=${probed.scrollY}  h1Lines=${probed.h1WrappedLines}  hudOp=${probed.hudOpacityComputed}`);
    }

    await ctx.close();
  }

  await browser.close();
  await fs.writeFile(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2));
  console.log(`\nReport written → ${path.join(OUT, 'report.json')}`);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
