import { describe, expect, it } from "vitest";
import { globSync, readFileSync } from "node:fs";
import path from "node:path";

/* ─────────────────────────────────────────────────────────────────────────────
   No monospace, anywhere.

   DM Mono was in the original handoff and had 74 call sites across 32 files,
   plus a family token, a Tailwind theme entry, a rule on `.doc-prose code` and
   a Courier stack in every email template. Removing it by hand is the kind of
   sweep that leaves three behind, and the three it leaves are the ones nobody
   loads — a legal page, a Supabase template, the preview gallery.

   Two things are checked, and the second matters more than it looks:

   Tailwind's preflight styles <code>, <kbd>, <samp> and <pre> with
   `--theme(--font-mono, …ui-monospace…)`. DELETING `--font-mono` does not
   remove monospace from the product — it hands those four elements Tailwind's
   own monospace fallback. The token has to exist and has to say sans, so the
   test asserts it is there rather than that it is gone.
   ───────────────────────────────────────────────────────────────────────────── */

const SRC = path.join(process.cwd(), "src");

/** Everything shipped: screens, components, libraries and the email templates. */
function sourceFiles(): string[] {
  return globSync("**/*.{ts,tsx,css,html}", { cwd: SRC })
    .filter((f) => !f.includes(".test."))
    .map((f) => path.join(SRC, f));
}

/** Comments are prose about the decision, not the decision. */
function code(text: string): string {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
}

/** Any family that would render as monospace, however it is spelled. */
const FAMILY = /\b(?:monospace|ui-monospace|Courier|Menlo|Monaco|Consolas|SFMono|DM[ _]Mono|Liberation Mono)\b/;

/** The `font-mono` utility. The lookbehind is what lets `--font-mono` through. */
const UTILITY = /(?<![\w-])font-mono(?![\w-])/;

describe("no monospace font", () => {
  it("is asked for nowhere in the source", () => {
    const found: string[] = [];

    for (const file of sourceFiles()) {
      const lines = code(readFileSync(file, "utf8")).split("\n");
      lines.forEach((line, i) => {
        if (FAMILY.test(line) || UTILITY.test(line)) {
          found.push(`${path.relative(SRC, file)}:${i + 1}: ${line.trim()}`);
        }
      });
    }

    expect(found).toEqual([]);
  });

  it("keeps --font-mono defined and pointed at the sans stack", () => {
    // Not redundant with the check above: `--font-mono` survives its lookbehind
    // deliberately. If a later tidy-up deletes the line as dead, every <code>,
    // <kbd>, <samp> and <pre> in the product silently goes back to monospace
    // via Tailwind's preflight, and nothing else in this suite would notice.
    const css = readFileSync(path.join(SRC, "app/globals.css"), "utf8");
    expect(css).toMatch(/--font-mono:\s*var\(--sans\);/);
  });
});
