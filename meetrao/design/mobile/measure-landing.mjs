import { chromium } from "/opt/node22/lib/node_modules/playwright/index.mjs";
import fs from "node:fs"; import path from "node:path";
const OUT = path.dirname(new URL(import.meta.url).pathname);
const names = Object.keys(JSON.parse(fs.readFileSync(path.join(OUT, "landing-sizes.json"), "utf8")));
for (const n of names) {
  const src = fs.readFileSync(path.join(OUT, `${n}.dc.html`), "utf8");
  const head = src.match(/<helmet>([\s\S]*?)<\/helmet>/)[1];
  const body = src.split("</helmet>")[1].split("</x-dc>")[0];
  fs.writeFileSync(path.join(OUT, `${n}.render.html`),
    `<!doctype html><html><head><meta charset="utf-8">${head}</head><body>${body}</body></html>`);
}
const clean = { ...process.env };
for (const k of Object.keys(clean)) if (/^(https?|all|no)_proxy$/i.test(k)) delete clean[k];
const b = await chromium.launch({ env: clean, args: ["--no-proxy-server"] });
const p = await b.newPage({ viewport: { width: 390, height: 900 }, deviceScaleFactor: 2 });
const out = {};
for (const n of names) {
  await p.goto(`file://${path.join(OUT, n)}.render.html`, { waitUntil: "load" });
  await p.waitForTimeout(600);
  const r = await p.evaluate(() => ({ h: document.documentElement.scrollHeight, w: document.documentElement.scrollWidth }));
  out[n] = r.h;
  console.log(`  ${n.padEnd(17)} ${String(r.h).padStart(6)}px  w=${r.w}${r.w > 391 ? "  ← OVERFLOW" : ""}`);
}
fs.writeFileSync(path.join(OUT, "landing-heights.json"), JSON.stringify(out, null, 1));
await b.close();
