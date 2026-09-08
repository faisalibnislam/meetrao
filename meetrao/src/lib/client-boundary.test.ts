import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { globSync } from "node:fs";
import path from "node:path";

/* ─────────────────────────────────────────────────────────────────────────────
   Server code must not call a function that lives in a client module.

   Every export of a "use client" module becomes a client reference on the
   server. Importing one into a Server Component and rendering it as JSX is the
   whole point. CALLING one throws at request time:

     Attempted to call rulesToDays() from the server but rulesToDays is on the
     client.

   Nothing else catches this. `next build` compiles it, `tsc` type-checks it,
   and a unit test imports the module directly because Vitest does not honour
   the directive — so it only ever appears as a 500 and an opaque digest in a
   browser. Onboarding steps 4 and 5 shipped that way.

   The rule this enforces: a server module may import a Component (PascalCase)
   or a type from a client module, and nothing else. A lowercase value import
   is a function, and a function is what breaks.
   ───────────────────────────────────────────────────────────────────────────── */

const SRC = path.join(process.cwd(), "src");

function sourceFiles(): string[] {
  return globSync("**/*.{ts,tsx}", { cwd: SRC })
    .filter((f) => !f.endsWith(".test.ts") && !f.endsWith(".test.tsx"))
    .map((f) => path.join(SRC, f));
}

function isClientModule(file: string): boolean {
  return /^\s*["']use client["']/.test(readFileSync(file, "utf8"));
}

/** Resolves an "@/..." or relative specifier to a file on disk. */
function resolve(from: string, spec: string): string | null {
  const base = spec.startsWith("@/")
    ? path.join(SRC, spec.slice(2))
    : spec.startsWith(".")
      ? path.resolve(path.dirname(from), spec)
      : null;
  if (!base) return null;

  for (const candidate of [`${base}.ts`, `${base}.tsx`, path.join(base, "index.ts"), path.join(base, "index.tsx")]) {
    try {
      readFileSync(candidate);
      return candidate;
    } catch {
      // keep looking
    }
  }
  return null;
}

describe("the client boundary", () => {
  it("never calls a client module's function from the server", () => {
    const offences: string[] = [];

    for (const file of sourceFiles()) {
      if (isClientModule(file)) continue; // client calling client is fine

      const source = readFileSync(file, "utf8");
      const imports = source.matchAll(/import\s+(type\s+)?\{([^}]*)\}\s+from\s+["']([^"']+)["']/g);

      for (const [, typeOnly, names, spec] of imports) {
        if (typeOnly) continue;

        const target = resolve(file, spec);
        if (!target || !isClientModule(target)) continue;

        for (const raw of names.split(",")) {
          const name = raw.trim().replace(/^type\s+/, "").split(/\s+as\s+/)[0].trim();
          if (!name || raw.trim().startsWith("type ")) continue;
          // Components are PascalCase and get rendered, not called.
          if (/^[A-Z]/.test(name)) continue;

          offences.push(
            `${path.relative(SRC, file)} imports \`${name}\` from the client module ${spec} — ` +
              `move it to a module with no "use client", or import it as a type`,
          );
        }
      }
    }

    expect(offences, `\n${offences.join("\n")}\n`).toEqual([]);
  });
});
