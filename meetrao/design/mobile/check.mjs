import { chromium } from "/opt/node22/lib/node_modules/playwright/index.mjs";
import fs from "node:fs"; import path from "node:path";
const OUT = path.dirname(new URL(import.meta.url).pathname);

// The .dc.html minus its x-dc wrapper is a plain page; render it to see what
// the artboard will show.
for (const f of fs.readdirSync(OUT).filter((f) => f.endsWith(".dc.html"))) {
  const src = fs.readFileSync(path.join(OUT, f), "utf8");
  const head = src.match(/<helmet>([\s\S]*?)<\/helmet>/)[1];
  const body = src.split("</helmet>")[1].split("</x-dc>")[0];
  fs.writeFileSync(path.join(OUT, f.replace(".dc.html", ".render.html")),
    `<!doctype html><html><head><meta charset="utf-8">${head}</head><body>${body}</body></html>`);
}

const clean = { ...process.env };
for (const k of Object.keys(clean)) if (/^(https?|all|no)_proxy$/i.test(k)) delete clean[k];
const b = await chromium.launch({ env: clean, args: ["--no-proxy-server"] });
const p = await b.newPage({ viewport: { width: 390, height: 900 }, deviceScaleFactor: 2 });
const sizes = JSON.parse(fs.readFileSync(path.join(OUT, "sizes.json"), "utf8"));
for (const name of Object.keys(sizes)) {
  await p.goto(`file://${path.join(OUT, name)}.render.html`, { waitUntil: "load" });
  await p.waitForTimeout(700);
  const r = await p.evaluate(() => ({
    h: document.documentElement.scrollHeight,
    w: document.documentElement.scrollWidth,
    text: document.body.innerText.trim().slice(0, 40).replace(/\s+/g, " "),
    controls44: [...document.querySelectorAll("button,a[href]")].filter((e) => {
      const r = e.getBoundingClientRect(); return r.height > 0 && r.height >= 44; }).length,
    controlsUnder: [...document.querySelectorAll("button,a[href]")].filter((e) => {
      const r = e.getBoundingClientRect(); return r.height > 0 && r.height < 44; }).length,
  }));
  const flag = r.w > 391 ? " ← OVERFLOW" : "";
  console.log(`  ${name.padEnd(14)} ${String(r.h).padStart(6)}px  w=${r.w}${flag}  controls ≥44: ${r.controls44}, <44: ${r.controlsUnder}   «${r.text}»`);
  await p.screenshot({ path: path.join(OUT, `shot-${name}.png`), fullPage: r.h < 3000 });
}
await b.close();
