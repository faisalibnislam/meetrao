import { describe, expect, it, vi, afterEach } from "vitest";
import { siteUrl } from "@/lib/env";

afterEach(() => vi.unstubAllEnvs());

describe("siteUrl", () => {
  it("prefers the configured origin", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://meetrao.com");
    expect(siteUrl()).toBe("https://meetrao.com");
  });
  it("trims a trailing slash, which would break an exact allow-list match", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://meetrao.com/");
    expect(siteUrl()).toBe("https://meetrao.com");
  });
  it("treats an empty value as unset rather than letting it win", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
    vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "meetrao.vercel.app");
    expect(siteUrl()).toBe("https://meetrao.vercel.app");
  });
  it("prefers the stable production host over the per-deployment one", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
    vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "meetrao.vercel.app");
    vi.stubEnv("VERCEL_URL", "meetrao-a1b2c3-faisalibnislam.vercel.app");
    expect(siteUrl()).toBe("https://meetrao.vercel.app");
  });
  it("falls back to localhost when nothing is set", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
    vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "");
    vi.stubEnv("VERCEL_URL", "");
    expect(siteUrl()).toBe("http://localhost:3000");
  });
});
