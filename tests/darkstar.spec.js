// Regression suite for the three known UI/UX issues.
// One test per issue (A/B/C). Run via `npm run test:e2e`.
import { test, expect } from '@playwright/test';

const waitForReady = async (page) => {
  await page.goto('/');
  await page.waitForFunction(
    () => !!document.querySelector('h1') && /DARKSTAR/.test(document.querySelector('h1').textContent || ''),
    null,
    { timeout: 10_000 },
  );
  // Anime.js intro + first scroll-RAF tick.
  await page.waitForTimeout(800);
};

test.describe('Darkstar UI regressions', () => {
  test('A: DARKSTAR title fits on a single line at 1920x1080', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await waitForReady(page);

    const lines = await page.evaluate(() => {
      const h1 = document.querySelector('h1');
      if (!h1) return null;
      const cs = getComputedStyle(h1);
      const lh = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.2;
      const rect = h1.getBoundingClientRect();
      return Math.round(rect.height / lh);
    });

    expect(lines, 'h1 should occupy a single line at 1920px wide').toBe(1);
  });

  test('B: aircraft rotates with scroll', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await waitForReady(page);

    const exposed = await page.evaluate(() => !!window.__DARKSTAR_STATE);
    expect(exposed, 'window.__DARKSTAR_STATE must be exposed in dev for this test').toBe(true);

    const initial = await page.evaluate(() => window.__DARKSTAR_STATE.rotateY ?? 0);

    // Scroll deep enough into the ScrollSection to hit phase 1 mid-sweep.
    await page.evaluate(() => window.scrollTo(0, Math.round(window.innerHeight * 2.5)));
    await page.waitForTimeout(700);

    const mid = await page.evaluate(() => window.__DARKSTAR_STATE.rotateY ?? 0);

    expect(
      Math.abs(mid - initial),
      `rotateY should change by >5° between hero and mid-scroll (got ${initial.toFixed(2)} → ${mid.toFixed(2)})`,
    ).toBeGreaterThan(5);
  });

  test('C: HUD panel is legible past hero phase', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await waitForReady(page);

    // Scroll well past the hero into the wireframe phase.
    const max = await page.evaluate(() => document.documentElement.scrollHeight - window.innerHeight);
    await page.evaluate((y) => window.scrollTo(0, y), Math.round(max * 0.30));
    await page.waitForTimeout(700);

    const probe = await page.evaluate(() => {
      const hud = document.querySelector('.hud-panel');
      if (!hud) return null;
      const cs = getComputedStyle(hud);
      return { opacity: parseFloat(cs.opacity), bg: cs.backgroundColor };
    });

    expect(probe, 'a .hud-panel must be present').not.toBeNull();
    expect(probe.opacity, 'HUD wrapper opacity should be ≥ 0.85 past hero').toBeGreaterThanOrEqual(0.85);
  });
});
