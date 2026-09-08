import { describe, expect, it, vi } from "vitest";

/* Runs the real onboarding page for each step with the data layer stubbed, then
   server-renders the tree.

   A server component that throws in production surfaces as an opaque digest in
   the browser and a line in a log nobody is watching. This executes the same
   code paths where the stack is readable. It deliberately stubs only the data
   layer and the client runtime — the page, the step dispatch, the pure helpers
   and the components are all real. */

const profile = {
  id: "u1", username: "faisalislamyahoo", full_name: "Abu Mohammad Faisal",
  email: "a@example.invalid", timezone: "UTC", default_duration_minutes: 30,
  default_notice_minutes: 60, onboarding_completed_at: null,
};

vi.mock("@/lib/data/session", () => ({
  requireSession: async () => ({ userId: "u1", profile }),
}));
vi.mock("@/lib/data/availability", () => ({
  ensureDefaultAvailability: async () => true,
}));
vi.mock("@/lib/google/connection", () => ({
  connectionStatus: async () => ({ connected: false, accountEmail: null }),
}));
vi.mock("@/lib/actions/auth", () => ({ signOut: async () => {} }));

// Router and toast are client-runtime concerns vitest has no provider for.
vi.mock("next/navigation", async (orig) => ({
  ...(await orig<Record<string, unknown>>()),
  useRouter: () => ({ push: () => {}, replace: () => {}, refresh: () => {} }),
  usePathname: () => "/onboarding/4",
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock("@/components/ui/toast", async (orig) => ({
  ...(await orig<Record<string, unknown>>()),
  useToast: () => () => {},
}));

// Minimal query builder. The client itself must NOT be thenable, or `await
// supabaseServer()` unwraps it instead of returning it.
vi.mock("@/lib/supabase/server", () => {
  const rows: unknown[] = [];
  const query: Record<string, unknown> = {};
  for (const m of ["select", "eq", "order", "limit"]) {
    query[m] = () => query;
  }
  query.maybeSingle = async () => ({ data: null, error: null });
  query.then = (resolve: (v: unknown) => unknown) => resolve({ data: rows, error: null });
  return { supabaseServer: async () => ({ from: () => query }) };
});

async function render(step: string): Promise<string> {
  const { default: OnboardingStep } = await import("./[step]/page");
  const { renderToStaticMarkup } = await import("react-dom/server");
  const element = await OnboardingStep({
    params: Promise.resolve({ step }),
    searchParams: Promise.resolve({}),
  });
  return renderToStaticMarkup(element as React.ReactElement);
}

describe("onboarding renders every step", () => {
  it("1 · claim your link", async () => expect(await render("1")).toContain("meetrao.com/"));
  it("2 · connect a calendar", async () => expect(await render("2")).toMatch(/calendar/i));
  it("3 · first meeting", async () => expect(await render("3")).toMatch(/meeting/i));
  it("4 · availability", async () => expect(await render("4")).toContain("When are you free?"));
  it("5 · ready", async () => expect(await render("5")).toMatch(/ready|link/i));

  // Step 4 is the only one that calls timezoneOptions(), which reads offsets
  // through Intl at request time. The select renders the chosen label only
  // until it is opened, so that is what this checks.
  it("builds the timezone label on step 4, the only step that needs one", async () => {
    expect(await render("4")).toContain("GMT+00:00  UTC");
  });
});
