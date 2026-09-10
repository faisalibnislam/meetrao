import { chromium } from "/opt/node22/lib/node_modules/playwright/index.mjs";
import fs from "node:fs";
import path from "node:path";

/* The landing page, sliced into one artboard per section.

   The whole page is 12,850px at 390 — real, but nobody can comment usefully on
   a ribbon that long. Each top-level block becomes its own frame instead, so a
   comment can land on "the FAQ" or "the footer CTA" rather than on a coordinate
   somewhere down a mile of scroll.

   Same capture rules as capture.mjs (see the README): touch rules forced on,
   Google Fonts in place of the self-hosted faces, images inlined, scripts
   stripped. The header and the hero are ONE frame on purpose — the hero pulls
   itself up 78px beneath a sticky header, and splitting them would lose that
   overlap and show a join that does not exist on the page.
*/

const WIDTH = 390;
const OUT = path.dirname(new URL(import.meta.url).pathname);

const BLOCKS = [
  ["LandingHero", 0, 2, "Landing · hero"],          // header + section#top together
  ["LandingProblem", 2, 3, "Landing · the problem"],
  ["LandingHow", 3, 4, "Landing · how it works"],
  ["LandingWhy", 4, 5, "Landing · why it matters"],
  ["LandingCompare", 5, 6, "Landing · before & after"],
  ["LandingProduct", 6, 7, "Landing · what you get"],
  ["LandingUseCases", 7, 8, "Landing · use cases"],
  ["LandingFaq", 8, 9, "Landing · FAQ"],
  ["LandingFooter", 9, 10, "Landing · footer"],
];

const GOOGLE = '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?' +
  'family=Instrument+Sans:wght@400;500;600;700&amp;family=Instrument+Serif&amp;display=swap">';

const UNFRAME = `
    html, body { margin: 0; width: ${WIDTH}px; overflow-x: clip; }
    .app-scale, .h-screen { height: auto !important; min-height: 0 !important; }
    [class*="overflow-hidden"] { overflow: visible !important; }
    [class*="overflow-y-auto"] { overflow: visible !important; }
    [class*="min-h-0"] { min-height: 0 !important; }
`;

const clean = { ...process.env };
for (const k of Object.keys(clean)) if (/^(https?|all|no)_proxy$/i.test(k)) delete clean[k];
const browser = await chromium.launch({ env: clean, args: ["--no-proxy-server"] });
const ctx = await browser.newContext({
  viewport: { width: WIDTH, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2,
});
const page = await ctx.newPage();

// Signed out — a visitor never sees the account menu.
await page.goto("http://localhost:3200/", { waitUntil: "networkidle" });

// The sticky header would otherwise float over whichever section it lands in.
await page.addStyleTag({ content: UNFRAME + "\nheader { position: static !important; }" });

await page.evaluate(async () => {
  const toData = async (url) => {
    const res = await fetch(url);
    const blob = await res.blob();
    return await new Promise((r) => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.readAsDataURL(blob); });
  };
  await Promise.all([...document.querySelectorAll("img")].map(async (img) => {
    const src = img.getAttribute("src") || "";
    if (!src || src.startsWith("data:")) return;
    const abs = new URL(src, location.href);
    if (abs.origin !== location.origin) return;
    try { img.setAttribute("src", await toData(abs.href)); img.removeAttribute("srcset"); } catch {}
  }));
});
await page.waitForTimeout(500);

const { css, blocks } = await page.evaluate(() => {
  let css = "";
  for (const sheet of document.styleSheets) {
    try { for (const rule of sheet.cssRules) css += rule.cssText + "\n"; } catch {}
  }
  const tops = [];
  const walk = (el, depth) => {
    for (const k of el.children) {
      const t = k.tagName.toLowerCase();
      if (["header", "section", "footer"].includes(t)) tops.push(k);
      else if (depth < 3) walk(k, depth + 1);
    }
  };
  walk(document.body, 0);
  return { css, blocks: tops.map((b) => b.outerHTML) };
});

const sheet = css
  .replace(/@media \(pointer: coarse\)/g, "@media all")
  .replace(/@font-face\s*\{[^}]*\}/g, "");

const sizes = {};
for (const [name, from, to, title] of BLOCKS) {
  const markup = blocks.slice(from, to).join("\n")
    .replace(/<script[\s\S]*?<\/script>/g, "")
    .replace(/\{\{/g, "&#123;&#123;");

  const doc = `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <script src="./support.js"></script>
</head>
<body>
<x-dc>
<helmet>
  ${GOOGLE}
  <style>
${sheet}
${UNFRAME}
header { position: static; }
  </style>
</helmet>
<div style="width: ${WIDTH}px; background: #e7e4dc">
${markup}
</div>
</x-dc>
</body>
</html>
`;
  fs.writeFileSync(path.join(OUT, `${name}.dc.html`), doc);
  sizes[name] = { title, bytes: doc.length };
  console.log(`  ${name.padEnd(17)} ${(doc.length / 1024).toFixed(0)}KB`);
}
fs.writeFileSync(path.join(OUT, "landing-sizes.json"), JSON.stringify(sizes, null, 1));
await browser.close();
