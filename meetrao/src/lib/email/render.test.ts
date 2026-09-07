import { describe, expect, it } from "vitest";
import { renderSubject, renderTemplate, type TemplateName } from "./render";

/**
 * The templates are the design's send-ready HTML with merge fields dropped in.
 * What can silently break: a field the sender forgot (the recipient gets a
 * literal `{{guest_name}}`), and guest-controlled text escaping out of the
 * markup. Both are asserted here rather than left to a live send.
 */
const FIELDS: Record<TemplateName, Record<string, string>> = {
  "verify-email": {
    verify_url: "https://meetrao.com/verify?token=abc",
    expires_in: "24 hours",
  },
  welcome: {
    first_name: "Faisal",
    booking_url: "meetrao.com/faisal",
    onboarding_url: "https://meetrao.com/onboarding/1",
  },
  "booking-new-host": {
    guest_name: "John Smith",
    guest_first: "John",
    guest_email: "john@example.com",
    guest_note: "Looking forward to it.",
    meeting_name: "30 Minute Consultation",
    start_long: "Monday, September 7 · 3:00 – 3:30 PM",
    start_short: "Monday, September 7 at 3:00 PM",
    timezone: "GMT+06:00 Dhaka",
    meet_url: "https://meet.google.com/abc-defg-hij",
    meet_url_label: "meet.google.com/abc-defg-hij",
  },
  "booking-new-guest": {
    guest_first: "John",
    host_name: "Adam Voigt",
    meeting_name: "30 Minute Consultation",
    duration: "30 minutes",
    start_long: "Monday, September 7 · 3:00 – 3:30 PM",
    start_short: "Monday, September 7 at 3:00 PM",
    guest_timezone: "GMT−04:00 New York",
    meet_url: "https://meet.google.com/abc-defg-hij",
    meet_url_label: "meet.google.com/abc-defg-hij",
  },
  "booking-changed": {
    changed_by: "Adam Voigt",
    meeting_name: "30 Minute Consultation",
    old_start_long: "Monday, September 7 · 3:00 – 3:30 PM",
    start_long: "Tuesday, September 8 · 11:00 – 11:30 AM",
    start_short: "Tuesday, September 8 at 11:00 AM",
    meet_url: "https://meet.google.com/abc-defg-hij",
    meet_url_label: "meet.google.com/abc-defg-hij",
  },
  "booking-cancelled": {
    meeting_name: "30 Minute Consultation",
    other_party: "John Smith",
    changed_by: "John Smith",
    old_start_long: "Monday, September 7 · 3:00 – 3:30 PM",
    old_start_short: "Monday, September 7 at 3:00 PM",
    cancelled_at: "Sunday, September 6 · 6:42 AM",
    cancel_reason: "No reason given.",
  },
};

const NAMES = Object.keys(FIELDS) as TemplateName[];

describe("email templates", () => {
  it("covers all six", () => {
    expect(NAMES).toHaveLength(6);
  });

  for (const name of NAMES) {
    describe(name, () => {
      it("renders with every merge field filled", () => {
        const html = renderTemplate(name, FIELDS[name]);
        expect(html).not.toMatch(/\{\{/);
        expect(html.length).toBeGreaterThan(1000);
      });

      it("keeps the design's table markup", () => {
        // A div-based rewrite breaks Outlook; this is the guard against one.
        const html = renderTemplate(name, FIELDS[name]);
        expect(html).toContain("<table");
        expect(html.toLowerCase()).toContain("<!doctype html");
      });

      it("stays under the 100KB Gmail clipping threshold", () => {
        const html = renderTemplate(name, FIELDS[name]);
        expect(Buffer.byteLength(html, "utf8")).toBeLessThan(100_000);
      });
    });
  }

  it("throws rather than emailing a literal placeholder", () => {
    const missing: Record<string, string> = { ...FIELDS["verify-email"] };
    delete missing.verify_url;
    expect(() => renderTemplate("verify-email", missing)).toThrow(
      /unfilled fields.*verify_url/,
    );
  });

  it("escapes guest-controlled values", () => {
    // The note is free text a guest types. Unescaped it could close a cell and
    // rewrite the rest of the email.
    const html = renderTemplate("booking-new-host", {
      ...FIELDS["booking-new-host"],
      guest_name: '</td><script>alert(1)</script>',
      guest_note: 'Bring the "wireframes" & a plan </table>',
    });

    expect(html).not.toContain("<script>");
    expect(html).not.toContain("</td><script");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("&amp;");
  });

  it("fills the subject line's own fields", () => {
    expect(
      renderSubject("New booking: {{guest_name}} — {{meeting_name}}", {
        guest_name: "John Smith",
        meeting_name: "Intro Call",
      }),
    ).toBe("New booking: John Smith — Intro Call");
  });
});
