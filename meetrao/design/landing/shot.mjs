import { chromium } from "/opt/node22/lib/node_modules/playwright/index.mjs";
const clean = { ...process.env };
for (const k of Object.keys(clean)) if (/^(https?|all|no)_proxy$/i.test(k)) delete clean[k];
const browser = await chromium.launch({ env: clean, args: ["--no-proxy-server"] });
for (const [file, w] of [["Main", 1440], ["Mobile", 390]]) {
  const page = await browser.newPage({ viewport: { width: w, height: 900 } });
  await page.goto(`file:///home/claude/repo/meetrao/design/landing/${file}.measure.html`, { waitUntil: "load" });
  await page.waitForTimeout(1200);
  const r = await page.evaluate(() => ({
    h: document.documentElement.scrollHeight,
    w: document.documentElement.scrollWidth,
    overflow: document.documentElement.scrollWidth > window.innerWidth,
  }));
  console.log(`${file.padEnd(7)} ${w}px wide -> content height ${r.h}px   (scrollWidth ${r.w}${r.overflow ? "  ← HORIZONTAL OVERFLOW" : ""})`);
  await page.screenshot({ path: `${file}.full.png`, fullPage: true });
  await page.close();
}
await browser.close();
