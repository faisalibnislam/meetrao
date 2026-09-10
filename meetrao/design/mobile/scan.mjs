import { chromium } from "/opt/node22/lib/node_modules/playwright/index.mjs";
import fs from "node:fs"; import path from "node:path";
const OUT = path.dirname(new URL(import.meta.url).pathname);
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
const p = await b.newPage({ viewport: { width: 390, height: 900 } });
for (const f of fs.readdirSync(OUT).filter((f) => f.endsWith(".render.html"))) {
  await p.goto(`file://${path.join(OUT, f)}`, { waitUntil: "load" });
  await p.waitForTimeout(500);
  const r = await p.evaluate(() => {
    const bad = [];
    for (const el of document.querySelectorAll("a[href], button")) {
      const r = el.getBoundingClientRect();
      if (!r.width) continue;
      const par = el.parentElement;
      const pr = par.getBoundingClientRect();
      const scrolls = ["auto", "scroll"].includes(getComputedStyle(par).overflowX);
      if (!scrolls && (r.right > pr.right + 1 || r.left < pr.left - 1)) {
        bad.push({ txt: (el.innerText || "").trim().replace(/\s+/g," ").slice(0, 24),
          out: Math.round(Math.max(r.right - pr.right, pr.left - r.left)),
          parent: (par.getAttribute("class") || "").slice(0, 40) });
      }
    }
    return bad;
  });
  if (r.length) {
    console.log(`\n${f.replace(".render.html","")}: ${r.length} controls outside their parent`);
    for (const x of r.slice(0, 4)) console.log(`   +${x.out}px  «${x.txt}»  parent: ${x.parent}`);
  }
}
await b.close();
console.log("\n(scan complete)");
