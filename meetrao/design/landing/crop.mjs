import { chromium } from "/opt/node22/lib/node_modules/playwright/index.mjs";
const clean = { ...process.env };
for (const k of Object.keys(clean)) if (/^(https?|all|no)_proxy$/i.test(k)) delete clean[k];
const b = await chromium.launch({ env: clean, args: ["--no-proxy-server"] });
const p = await b.newPage({ viewport: { width: 1440, height: 1000 } });
await p.goto("file:///home/claude/repo/meetrao/design/landing/Main.measure.html", { waitUntil: "load" });
await p.waitForTimeout(1500);
const bands = [["top", 0], ["foot", 6650]];
for (const [name, y] of bands) {
  await p.evaluate((y) => window.scrollTo(0, y), y);
  await p.waitForTimeout(250);
  await p.screenshot({ path: `band-${name}.png` });
}
await b.close();
