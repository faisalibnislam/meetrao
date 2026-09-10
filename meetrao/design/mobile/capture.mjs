import { chromium } from "/opt/node22/lib/node_modules/playwright/index.mjs";
import fs from "node:fs";
import path from "node:path";

/* Captures the REAL mobile pages as design-canvas artboards.

   Not a redrawing: each artboard is the page's own rendered DOM plus its own
   compiled stylesheet, lifted out of a live 390px render. What you see on the
   canvas is what the browser painted.

   Three things have to be rewritten on the way out, and each would otherwise be
   a silent lie:

   1. `@media (pointer: coarse)` becomes `@media all`. The canvas runs in a
      desktop iframe, so the coarse-pointer rules — the entire 44px touch-target
      pass — would NOT match, and every control would render at its DESKTOP size
      inside a 390px frame. Forcing them on is what makes the artboard honest.

   2. next/font self-hosts its woff2 under /_next/static, which does not exist
      inside a published artifact. The @font-face blocks are dropped and the
      same families come from Google Fonts, which is the one host the artifact
      CSP admits.

   3. Scripts are stripped. There is no server behind the artboard, so hydration
      would only throw; the markup is already in its rendered state.
*/

const ROUTES = [
  ["Main", "/dashboard", "Dashboard", "in"],
  ["Bookings", "/bookings", "Bookings", "in"],
  ["Meetings", "/meetings", "Meetings", "in"],
  ["Contacts", "/contacts", "Contacts", "in"],
  ["Notifications", "/notifications", "Notifications", "in"],
  ["Availability", "/availability", "Availability", "in"],
  ["Settings", "/settings/notifications", "Settings · Notifications", "in"],
  ["Landing", "/", "Landing page", "out"],
  ["BookingPage", "/adam-voigt-consulting/30-minute-consultation", "Public booking page", "out"],
  ["Login", "/login", "Log in", "out"],
];

const WIDTH = 390;
const OUT = path.dirname(new URL(import.meta.url).pathname);

const GOOGLE = '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?' +
  'family=Instrument+Sans:wght@400;500;600;700&amp;family=Instrument+Serif&amp;display=swap">';

const clean = { ...process.env };
for (const k of Object.keys(clean)) if (/^(https?|all|no)_proxy$/i.test(k)) delete clean[k];
const browser = await chromium.launch({ env: clean, args: ["--no-proxy-server"] });
const cookie = fs.readFileSync(path.join(OUT, "../../scratchpad-cookie.txt"), "utf8").trim();
const ci = cookie.indexOf("=");

const mk = async (signedIn) => {
  const ctx = await browser.newContext({
    viewport: { width: WIDTH, height: 844 },
    isMobile: true, hasTouch: true, deviceScaleFactor: 2,
  });
  if (signedIn) {
    await ctx.addCookies([{ name: cookie.slice(0, ci), value: cookie.slice(ci + 1), domain: "localhost", path: "/" }]);
  }
  return ctx.newPage();
};
const pages = { in: await mk(true), out: await mk(false) };

const sizes = {};
for (const [name, route, title, who] of ROUTES) {
  const page = pages[who];
  const resp = await page.goto("http://localhost:3200" + route, { waitUntil: "networkidle" });
  if (!resp || resp.status() >= 400) { console.log(`  SKIP ${route} (HTTP ${resp?.status()})`); continue; }
  await page.waitForTimeout(300);

  const UNFRAME = `
    html, body { margin: 0; width: ${WIDTH}px; overflow-x: clip; }
    .app-scale, .h-screen { height: auto !important; min-height: 0 !important; }
    [class*="overflow-hidden"] { overflow: visible !important; }
    [class*="overflow-y-auto"] { overflow: visible !important; }
    [class*="min-h-0"] { min-height: 0 !important; }
  `;
  await page.addStyleTag({ content: UNFRAME });
  await page.waitForTimeout(200);

  await page.evaluate(async () => {
    const toData = async (url) => {
      const res = await fetch(url);
      const blob = await res.blob();
      return await new Promise((r) => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.readAsDataURL(blob); });
    };
    const jobs = [];
    for (const img of document.querySelectorAll("img")) {
      const src = img.getAttribute("src") || "";
      if (!src || src.startsWith("data:")) continue;
      const abs = new URL(src, location.href);
      if (abs.origin !== location.origin) continue;
      jobs.push(toData(abs.href).then((d) => {
        img.setAttribute("src", d);
        img.removeAttribute("srcset");
      }).catch(() => {}));
    }
    await Promise.all(jobs);
  });
  await page.waitForTimeout(300);

  const cap = await page.evaluate(() => {
    // Every rule the page actually uses, read out of the live stylesheets.
    let css = "";
    for (const sheet of document.styleSheets) {
      try { for (const rule of sheet.cssRules) css += rule.cssText + "\n"; } catch { /* cross-origin */ }
    }
    const html = document.body.innerHTML;
    return { css, html, height: document.documentElement.scrollHeight,
             rootClass: document.documentElement.className };
  });

  let css = cap.css
    // (1) make the touch rules apply in a desktop iframe
    .replace(/@media \(pointer: coarse\)/g, "@media all")
    // (2) drop the self-hosted faces; Google Fonts supplies the same families
    .replace(/@font-face\s*\{[^}]*\}/g, "");

  // Strip scripts and Next's inert markers.
  const body = cap.html
    .replace(/<script[\s\S]*?<\/script>/g, "")
    .replace(/<template[\s\S]*?<\/template>/g, "")
    // Handlebars would be read as a template hole by the canvas runtime.
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
${css}
/* The captured page assumes it owns the viewport. Inside an artboard it owns
   the frame instead: fixed height off, page scroll off, the app shell's
   h-screen resolved to the artboard's own height. */
${UNFRAME}
  </style>
</helmet>
<div style="width: ${WIDTH}px; min-height: 100%; background: #e7e4dc">
${body}
</div>
</x-dc>
</body>
</html>
`;
  fs.writeFileSync(path.join(OUT, `${name}.dc.html`), doc);
  sizes[name] = { title, height: cap.height, bytes: doc.length, who };
  console.log(`  ${name.padEnd(14)} ${route.padEnd(46)} ${cap.height}px  ${(doc.length / 1024).toFixed(0)}KB`);
}

fs.writeFileSync(path.join(OUT, "sizes.json"), JSON.stringify(sizes, null, 1));
await browser.close();
