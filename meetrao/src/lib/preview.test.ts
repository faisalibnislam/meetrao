import { describe, expect, it } from "vitest";
import { previewEnabled } from "./preview";

/* The gallery lists every component and resolves every token. Shipping it on
   meetrao.com would be handing out a map of the product's internals, so the one
   thing worth a test here is that production never serves it. */

describe("previewEnabled", () => {
  it("is on in local development", () => {
    expect(previewEnabled({ NODE_ENV: "development" } as NodeJS.ProcessEnv)).toBe(true);
  });

  it("is on for a Vercel preview deployment", () => {
    expect(previewEnabled({ NODE_ENV: "production", VERCEL_ENV: "preview" } as NodeJS.ProcessEnv)).toBe(true);
  });

  it("is off in production", () => {
    expect(previewEnabled({ NODE_ENV: "production", VERCEL_ENV: "production" } as NodeJS.ProcessEnv)).toBe(false);
    expect(previewEnabled({ NODE_ENV: "production" } as NodeJS.ProcessEnv)).toBe(false);
  });

  it("stays off in production even if something sets NODE_ENV wrong", () => {
    // VERCEL_ENV is set by the platform and cannot be overridden in project
    // settings, so it is the value worth trusting when the two disagree.
    expect(previewEnabled({ NODE_ENV: "development", VERCEL_ENV: "production" } as NodeJS.ProcessEnv)).toBe(false);
  });
});
