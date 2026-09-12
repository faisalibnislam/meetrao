import { afterEach, describe, expect, it, vi } from "vitest";
import { POSTAL_ADDRESS } from "@/lib/contact";

/* ─────────────────────────────────────────────────────────────────────────────
   "Set but blank" has to mean the same thing as "not set".

   zod's `.default(x)` only fires on `undefined`. A dashboard field that exists
   and is empty arrives as "", which is a perfectly good string, so the default
   never runs and the blank wins. Nothing throws.

   That matters because two of these defaults are real values, not placeholders.
   A blank EMAIL_FROM sends a message with no From address. A blank
   EMAIL_POSTAL_ADDRESS sends an email footer with no postal address in it,
   which is the one thing anti-spam law requires be in there — and the old
   `|| "Meetrao"` fallback in send.ts turned that into a footer reading just
   "Meetrao", which looks fine and is not compliant.

   Found for real: .env.local carried a retired US address long after the repo
   had stopped containing one, because an env var beats a code default and
   nobody re-reads their own dashboard.
   ───────────────────────────────────────────────────────────────────────────── */

const REQUIRED = {
  NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "test-anon-key-000000",
  SUPABASE_SERVICE_ROLE_KEY: "test-service-key-0000",
  GOOGLE_CLIENT_ID: "test-client-id",
  GOOGLE_CLIENT_SECRET: "test-client-secret",
  RESEND_API_KEY: "re_test_00000000",
  NEXT_PUBLIC_SITE_URL: "https://meetrao.com",
};

/** env() caches on first read, so each case needs a fresh module. */
async function envWith(overrides: Record<string, string>) {
  vi.resetModules();
  for (const [k, v] of Object.entries({ ...REQUIRED, ...overrides })) vi.stubEnv(k, v);
  const { env } = await import("./env");
  return env();
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("optional variables with a real default", () => {
  it("uses the default when the variable is absent", async () => {
    const e = await envWith({});
    expect(e.EMAIL_POSTAL_ADDRESS).toBe(POSTAL_ADDRESS);
    expect(e.EMAIL_FROM).toBe("Meetrao <support@meetrao.com>");
  });

  /* The whole point of this file. */
  it("uses the default when the variable is set but blank", async () => {
    const e = await envWith({ EMAIL_POSTAL_ADDRESS: "", EMAIL_FROM: "" });
    expect(e.EMAIL_POSTAL_ADDRESS).toBe(POSTAL_ADDRESS);
    expect(e.EMAIL_FROM).toBe("Meetrao <support@meetrao.com>");
  });

  it("uses the default when the variable is only whitespace", async () => {
    const e = await envWith({ EMAIL_POSTAL_ADDRESS: "   ", EMAIL_FROM: "\t" });
    expect(e.EMAIL_POSTAL_ADDRESS).toBe(POSTAL_ADDRESS);
    expect(e.EMAIL_FROM).toBe("Meetrao <support@meetrao.com>");
  });

  /* Overriding must still work — a deployment that genuinely wants a different
     sender or address is allowed to say so. */
  it("lets a real value override the default", async () => {
    const e = await envWith({
      EMAIL_POSTAL_ADDRESS: "1 Somewhere Street, Elsewhere",
      EMAIL_FROM: "Meetrao <other@meetrao.com>",
    });
    expect(e.EMAIL_POSTAL_ADDRESS).toBe("1 Somewhere Street, Elsewhere");
    expect(e.EMAIL_FROM).toBe("Meetrao <other@meetrao.com>");
  });

  it("never yields an empty postal address or sender, whatever is set", async () => {
    for (const value of ["", " ", "\n", "\t "]) {
      const e = await envWith({ EMAIL_POSTAL_ADDRESS: value, EMAIL_FROM: value });
      expect(e.EMAIL_POSTAL_ADDRESS.trim()).not.toBe("");
      expect(e.EMAIL_FROM.trim()).not.toBe("");
    }
  });
});

describe("optional variables that default to off", () => {
  it("treats blank and absent alike", async () => {
    const absent = await envWith({});
    const blank = await envWith({ ANALYTICS_SALT: "", NEXT_PUBLIC_GA_MEASUREMENT_ID: "", SUPPORT_INBOX: "" });
    expect(blank.ANALYTICS_SALT).toBe(absent.ANALYTICS_SALT);
    expect(blank.NEXT_PUBLIC_GA_MEASUREMENT_ID).toBe(absent.NEXT_PUBLIC_GA_MEASUREMENT_ID);
    expect(blank.SUPPORT_INBOX).toBe(absent.SUPPORT_INBOX);
  });
});
