import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

/* There were none. A failed read anywhere showed the framework's bare
   "Application error", the whole app gone with it, and every notFound()
   showed an unstyled 404 with no way back. */
const read = (rel: string) => readFileSync(path.join(process.cwd(), rel), "utf8");

describe("failures look like the product", () => {
  it.each(["src/app/not-found.tsx", "src/app/error.tsx", "src/app/(app)/error.tsx"])("%s exists", (file) => {
    expect(existsSync(path.join(process.cwd(), file))).toBe(true);
  });

  it.each(["src/app/error.tsx", "src/app/(app)/error.tsx"])("%s is a client boundary that offers a retry", (file) => {
    const text = read(file);
    expect(text.startsWith('"use client";')).toBe(true);
    expect(text).toContain("onClick={() => retry()}");
  });

  /* A Server Component's message is replaced before it reaches the browser,
     and one that is not could carry anything. The digest matches the log. */
  it.each(["src/app/error.tsx", "src/app/(app)/error.tsx"])("%s shows the digest, never the message", (file) => {
    const text = read(file);
    expect(text).toContain("error.digest");
    expect(text).not.toContain("error.message");
  });
});
