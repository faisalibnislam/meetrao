import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      // More specific first: "@/convex/..." resolves to the Convex directory,
      // which sits beside src/ rather than inside it. Vite matches aliases in
      // order, so this entry has to precede the bare "@".
      "@/convex": fileURLToPath(new URL("./convex", import.meta.url)),
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      // See test/server-only.ts — the real package throws outside a Server
      // Component, which would stop any server module being unit-tested.
      "server-only": fileURLToPath(new URL("./test/server-only.ts", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
  },
});
