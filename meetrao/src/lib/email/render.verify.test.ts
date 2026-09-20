import { describe, expect, it, vi, beforeAll } from "vitest";
import { POSTAL_ADDRESS } from "@/lib/contact";

/* Renders all six templates through the real senders, with the Resend SDK's
   network call intercepted. Catches an unfilled {{field}}, which render()
   throws on — the difference between an email and no email. */

const sent: { to: string; subject: string; html: string; headers?: unknown }[] = [];

beforeAll(() => {
  // Dummies, deliberately. The point is to render the templates, not to reach
  // Resend — the SDK's fetch is intercepted below and never leaves the process.
  for (const [k, v] of Object.entries({
    NEXT_PUBLIC_CONVEX_URL: "https://example-deployment.convex.cloud",
    GOOGLE_CLIENT_ID: "test-client-id",
    GOOGLE_CLIENT_SECRET: "test-client-secret",
    RESEND_API_KEY: "re_test_00000000",
    EMAIL_FROM: "Meetrao <hello@meetrao.com>",
    EMAIL_POSTAL_ADDRESS: POSTAL_ADDRESS,
    NEXT_PUBLIC_SITE_URL: "https://meetrao.vercel.app",
  })) {
    vi.stubEnv(k, v);
  }

  vi.stubGlobal("fetch", async (_url: string, init: RequestInit) => {
    const body = JSON.parse(String(init.body));
    sent.push(body);
    return new Response(JSON.stringify({ id: "test-id" }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  });
});

const profile = {
  id: "11111111-1111-1111-1111-111111111111",
  username: "faisal",
  full_name: "Faisal Islam",
  email: "host@example.invalid",
  notify_new_booking: true,
  notify_booking_cancelled: true,
  notify_booking_changed: true,
} as never;

const mail = {
  bookingId: "22222222-2222-2222-2222-222222222222",
  reference: "MR-7K2P-4QX9",
  meetingName: "30 Minute Consultation",
  guestName: "Amina Chowdhury",
  guestEmail: "guest@example.invalid",
  guestNote: "Happy to discuss scope & budget <script>",
  hostName: "Faisal Islam",
  hostEmail: "host@example.invalid",
  startLong: "Wednesday, 16 September 2026 at 10:00",
  startShort: "16 Sep",
  hostTimezoneLabel: "Asia/Dhaka (GMT+6)",
  guestTimezoneLabel: "Europe/London (GMT+1)",
  durationLabel: "30 minutes",
  meetUrl: "https://meet.google.com/abc-defg-hij",
};

const cancellation = { ...mail, cancelledByName: "Amina Chowdhury", cancelledAtLong: "8 September 2026 at 14:20", reason: "" };
const moved = { ...mail, oldStartLong: "Tuesday, 15 September 2026 at 09:00", changedByName: "Faisal Islam" };

describe("every transactional email renders", () => {
  it("renders all six with no unfilled fields", async () => {
    const m = await import("./send");
    const results = [
      ["welcome", await m.sendWelcome(profile)],
      ["booking-new-host", await m.sendBookingNewToHost(mail, profile)],
      ["booking-new-guest", await m.sendBookingNewToGuest(mail)],
      ["booking-cancelled-host", await m.sendCancellationToHost(cancellation, profile)],
      ["booking-cancelled-guest", await m.sendCancellationToGuest(cancellation)],
      ["booking-changed-host", await m.sendRescheduled(moved, "host", profile)],
      ["booking-changed-guest", await m.sendRescheduled(moved, "guest", null)],
    ] as const;

    for (const [name, r] of results) {
      expect(r.error, `${name} failed: ${r.error}`).toBeUndefined();
      expect(r.sent, `${name} was not sent`).toBe(true);
    }
    expect(sent).toHaveLength(7);

    for (const e of sent) {
      expect(e.html, `unfilled placeholder in "${e.subject}"`).not.toMatch(/\{\{/);
      expect(e.html.length).toBeGreaterThan(500);
    }
    console.log("\n" + sent.map((e) => `  ${e.to.padEnd(22)} ${e.subject}`).join("\n"));
  });

  it("prints the postal address in every footer, which anti-spam law requires", () => {
    for (const e of sent) {
      expect(e.html, `no postal address in "${e.subject}"`).toContain(POSTAL_ADDRESS);
    }
  });

  it("carries an absolute PNG logo, since email clients render no SVG", () => {
    for (const e of sent) {
      expect(e.html, `no logo in "${e.subject}"`).toContain(
        'src="https://meetrao.vercel.app/brand/meetrao-email-logo.png"',
      );
      expect(e.html, `logo must not be an SVG in "${e.subject}"`).not.toMatch(/<img[^>]+\.svg/);
    }
  });

  it("escapes guest input rather than injecting it", () => {
    const withNote = sent.find((e) => e.html.includes("Happy to discuss"));
    expect(withNote).toBeDefined();
    expect(withNote!.html).toContain("&lt;script&gt;");
    expect(withNote!.html).toContain("&amp;");
    expect(withNote!.html).not.toContain("<script>");
  });

  it("puts List-Unsubscribe on the welcome mail only", () => {
    const marketing = sent.filter((e) => JSON.stringify(e.headers ?? {}).includes("List-Unsubscribe"));
    expect(marketing).toHaveLength(1);
    expect(marketing[0].subject).toContain("Welcome");
  });
});
