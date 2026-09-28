import { escapeHtml, logoUrl, type Rendered } from "./emails";
import { dayPhraseTitle } from "./reminderWindow";

/* ─────────────────────────────────────────────────────────────────────────────
   The reminder: "this is tomorrow", and "this is in an hour".

   HERE RATHER THAN src/emails FOR THE SAME REASON THE AUTH MAILS ARE. Reminders
   are sent by a Convex cron, and a Convex function cannot read from disk — the
   templates in src/emails are loaded with readFileSync and have nothing to
   read here. The alternative was a Vercel cron, which on the Hobby plan runs
   once a day: a once-a-day cron cannot send something an hour before a
   meeting.

   The markup is the auth shell's, minus the parts a reminder has no use for —
   there is no code to expire and nothing to confirm — and plus the detail rows
   a reminder is mostly made of. It is a separate template rather than a
   parameter on that one because "This link expires in …" is load-bearing there
   and a lie here.

   BOTH MESSAGES CARRY A WAY OUT. The guest's names the host and links the
   booking, which is where they cancel or move it; the host's links their
   notification settings, which is where they turn reminders off. A reminder
   nobody can stop is the kind of mail people mark as spam, and one spam
   complaint costs more than the reminder was worth.
   ───────────────────────────────────────────────────────────────────────────── */

export type ReminderInput = {
  to: "host" | "guest";
  lead: "24h" | "1h";
  meetingName: string;
  /** The other person: the guest's name in the host's copy, and the reverse. */
  otherParty: string;
  /** Already formatted in the recipient's own zone by the caller. */
  whenLong: string;
  /** "later today" · "tomorrow" · "on Friday", in the recipient's own zone.
      A claim about the calendar, so it is computed rather than assumed from
      the lead time — see dayPhrase in ./reminderWindow. */
  dayPhrase: string;
  timezoneLabel: string;
  durationLabel: string;
  meetUrl: string | null;
  reference: string;
  site: string;
  postalAddress: string;
};

function row(label: string, value: string): string {
  return `<tr>
  <td style="padding:0 0 9px;font-family:Arial, 'Helvetica Neue', Helvetica, sans-serif;font-size:13px;line-height:20px;mso-line-height-rule:exactly;color:#66635C;width:86px;vertical-align:top">${escapeHtml(label)}</td>
  <td style="padding:0 0 9px;font-family:Arial, 'Helvetica Neue', Helvetica, sans-serif;font-size:13.5px;line-height:20px;mso-line-height-rule:exactly;color:#1A1917;vertical-align:top">${escapeHtml(value)}</td>
</tr>`;
}

export function renderReminder(input: ReminderInput): Rendered {
  const site = input.site.replace(/\/$/, "");
  const bookingUrl = `${site}/booking/${encodeURIComponent(input.reference)}`;
  const phrase = input.lead === "1h" ? "in an hour" : input.dayPhrase;

  // The button goes to Meet when there is a link, and to the booking when
  // there is not — a CTA that opens nothing is worse than a different CTA.
  const ctaUrl = input.meetUrl || bookingUrl;
  const ctaLabel = input.meetUrl ? "Join Google Meet" : "View your booking";

  const footNote =
    input.to === "host"
      ? `You received this because reminders are on in your notification settings: ${site}/settings/notifications`
      : `You received this because you booked this meeting. To move or cancel it: ${bookingUrl}`;

  const details =
    row("Meeting", input.meetingName) +
    row(input.to === "host" ? "Guest" : "Host", input.otherParty) +
    row("When", `${input.whenLong} · ${input.timezoneLabel}`) +
    row("Duration", input.durationLabel) +
    row("Where", input.meetUrl ? input.meetUrl.replace(/^https?:\/\//, "") : "Link to follow by email");

  const html = `<!DOCTYPE html>
<html lang="en" style="margin:0;padding:0">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>Reminder · Meetrao</title>
<!--[if mso]><style>table,td,div,p,a{font-family:Arial,sans-serif !important}</style><![endif]-->
<style>
  @media (max-width:620px){
    .mr-wrap{width:100% !important}
    .mr-pad{padding-left:22px !important;padding-right:22px !important}
    .mr-h1{font-size:28px !important;line-height:32px !important}
  }
</style>
</head>
<body style="margin:0;padding:0;background-color:#E7E4DC;-webkit-font-smoothing:antialiased">
<span style="display:none!important;visibility:hidden;opacity:0;color:transparent;height:0;width:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px">{{preheader}}</span>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;background-color:#E7E4DC">
<tr><td align="center" style="padding:28px 12px 40px">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" class="mr-wrap" style="width:600px;max-width:600px">
    <tr><td style="padding:0 0 18px 4px">
      <img src="{{logo_url}}" alt="Meetrao" width="100" height="22"
           style="display:block;width:100px;height:22px;border:0;outline:none;text-decoration:none;-ms-interpolation-mode:bicubic">
    </td></tr>
    <tr><td bgcolor="#FFFFFF" style="background-color:#FFFFFF;border:1px solid #E0DDD4;border-radius:12px">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%">

<tr><td class="mr-pad" style="padding:34px 34px 0">
  <span style="font-family:Arial, 'Helvetica Neue', Helvetica, sans-serif;font-size:11px;line-height:14px;mso-line-height-rule:exactly;letter-spacing:1px;text-transform:uppercase;color:#66635C">Reminder</span>
  <h1 class="mr-h1" style="margin:12px 0 0;font-family:Georgia, 'Times New Roman', serif;font-size:33px;line-height:37px;mso-line-height-rule:exactly;font-weight:normal;color:#1A1917">{{heading}}</h1>
  <p style="margin:14px 0 0;font-family:Arial, 'Helvetica Neue', Helvetica, sans-serif;font-size:15px;line-height:24px;mso-line-height-rule:exactly;color:#575550">{{body}}</p>
</td></tr>

<tr><td class="mr-pad" style="padding:22px 34px 0">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;background-color:#F4F3EE;border:1px solid #E0DDD4;border-radius:8px">
    <tr><td style="padding:16px 16px 7px">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%">{{details}}</table>
    </td></tr>
  </table>
</td></tr>

<tr><td class="mr-pad" style="padding:22px 34px 0"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
<td align="center" bgcolor="#14554A" style="border-radius:6px;border:1px solid #14554A">
  <a href="{{action_url}}" style="display:block;padding:13px 24px;font-family:Arial, 'Helvetica Neue', Helvetica, sans-serif;font-size:15px;line-height:18px;mso-line-height-rule:exactly;font-weight:bold;color:#ffffff;text-decoration:none">{{cta_label}}</a>
</td></tr></table></td></tr>

<tr><td class="mr-pad" style="padding:28px 34px 34px"><table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr><td height="1" bgcolor="#E0DDD4" style="height:1px;line-height:1px;font-size:0">&nbsp;</td></tr></table></td></tr>
      </table>
    </td></tr>
    <tr><td class="mr-pad" style="padding:20px 8px 0">
      <p style="margin:0 0 8px;font-family:Arial, 'Helvetica Neue', Helvetica, sans-serif;font-size:12px;line-height:18px;mso-line-height-rule:exactly;color:#66635C">{{disclaimer}}</p>
      <p style="margin:0;font-family:Arial, 'Helvetica Neue', Helvetica, sans-serif;font-size:12px;line-height:18px;mso-line-height-rule:exactly;color:#66635C">{{postal_address}}</p>
    </td></tr>
  </table>
</td></tr></table>
</body>
</html>`
    .split("{{preheader}}")
    .join(escapeHtml(`${input.meetingName} ${phrase} — ${input.whenLong}`))
    .split("{{heading}}")
    .join(escapeHtml(input.lead === "1h" ? "Starting in an hour" : `This is ${input.dayPhrase}`))
    .split("{{body}}")
    .join(
      escapeHtml(
        input.to === "host"
          ? `${input.otherParty} is expecting you ${phrase}.`
          : `${input.otherParty} is expecting you ${phrase}. Nothing to do — this is just a nudge.`,
      ),
    )
    .split("{{details}}")
    .join(details)
    .split("{{action_url}}")
    .join(escapeHtml(ctaUrl))
    .split("{{cta_label}}")
    .join(escapeHtml(ctaLabel))
    .split("{{disclaimer}}")
    .join(escapeHtml(footNote))
    .split("{{logo_url}}")
    .join(escapeHtml(logoUrl(site)))
    .split("{{postal_address}}")
    .join(escapeHtml(input.postalAddress));

  /* Same guard as the auth shell and as src/lib/email/send.ts: a token added
     to the markup and not to the list above would otherwise ship as literal
     braces to a real inbox. `details` is built from escaped values above, so
     it is inserted as markup deliberately — everything else is escaped. */
  const missed = html.match(/\{\{[a-z_]+\}\}/g);
  if (missed) throw new Error(`Reminder template has unfilled fields: ${[...new Set(missed)].join(", ")}`);

  return {
    subject:
      input.lead === "1h"
        ? `In an hour: ${input.meetingName} with ${input.otherParty}`
        : `${dayPhraseTitle(input.dayPhrase)}: ${input.meetingName} with ${input.otherParty}`,
    html,
  };
}
