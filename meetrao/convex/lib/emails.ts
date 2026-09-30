/* ─────────────────────────────────────────────────────────────────────────────
   The two emails Convex Auth sends: confirm your email, and reset your
   password.

   WHY THESE ARE HERE AND NOT IN src/emails. Convex Auth owns both flows and
   sends them from inside a Convex action, and Convex functions cannot import
   from src/ or read from disk — `src/lib/email/send.ts` loads its templates
   with readFileSync, which has nothing to read here. Until this file existed
   both messages went out with Auth.js's default template: unbranded, and with
   no postal address in the footer.

   `src/emails/verify-email.html` was the design for the first of them and has
   been deleted rather than left beside this. Two copies of one template is the
   trap the old Supabase version fell into — it went out for weeks with a
   footer reading "Meetrao" and nothing else, because nobody re-pasted it.

   ONE SHELL, TWO MESSAGES. The design's two layouts are the same table with
   different words in it, so the markup below is that table, filled by
   `shell()`. Structure, styles and spacing are the handoff's verbatim — the
   rule it is honouring is that a div-based rewrite breaks Outlook, not that
   the bytes may never be parameterised.
   ───────────────────────────────────────────────────────────────────────────── */

/** HTML-escapes a merge value. Applied to every substitution without exception. */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

type Shell = {
  /** Hidden preview line, shown by the inbox beside the subject. */
  preheader: string;
  eyebrow: string;
  heading: string;
  body: string;
  ctaLabel: string;
  actionUrl: string;
  /** Why the recipient got this, and what to do if it was not them. */
  disclaimer: string;
  expiresIn: string;
  logoUrl: string;
  postalAddress: string;
};

/*
 * NO UNSUBSCRIBE AND NO PREFERENCES LINK, on either message.
 *
 * The design's footer carries both, and the first version of this shipped with
 * them. They pointed at /settings/notifications, which requires the account the
 * recipient is in the middle of confirming or recovering — an unsubscribe that
 * cannot work is worse than none. Both messages are transactional: nobody can
 * opt out of the email that lets them into their own account, so offering the
 * choice is a lie as well as a dead link.
 *
 * The postal address stays. That is the part anti-spam law actually asks for,
 * and it is the part the old Supabase template left out.
 */
function shell(v: Shell): string {
  const html = `<!DOCTYPE html>
<html lang="en" style="margin:0;padding:0">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>{{eyebrow}} · Meetrao</title>
<!--[if mso]><style>table,td,div,p,a{font-family:Arial,sans-serif !important}</style><![endif]-->
<style>
  @media (max-width:620px){
    .mr-wrap{width:100% !important}
    .mr-pad{padding-left:22px !important;padding-right:22px !important}
    .mr-h1{font-size:28px !important;line-height:32px !important}
    .mr-stack{display:block !important;width:100% !important}
  }
</style>
</head>
<body style="margin:0;padding:0;background-color:#E7E4DC;-webkit-font-smoothing:antialiased">
<span style="display:none!important;visibility:hidden;opacity:0;color:transparent;height:0;width:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px">{{preheader}}</span>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;background-color:#E7E4DC">
<tr><td align="center" style="padding:28px 12px 40px">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" class="mr-wrap" style="width:600px;max-width:600px">
    <tr><td style="padding:0 0 18px 4px"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
<td style="vertical-align:middle">
  <img src="{{logo_url}}" alt="Meetrao" width="100" height="22"
       style="display:block;width:100px;height:22px;border:0;outline:none;text-decoration:none;-ms-interpolation-mode:bicubic">
</td>
</tr></table></td></tr>
    <tr><td bgcolor="#FFFFFF" style="background-color:#FFFFFF;border:1px solid #E0DDD4;border-radius:12px">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%">

<tr><td class="mr-pad" style="padding:34px 34px 0">
  <span style="font-family:Arial, 'Helvetica Neue', Helvetica, sans-serif;font-size:11px;line-height:14px;mso-line-height-rule:exactly;letter-spacing:1px;text-transform:uppercase;color:#66635C">{{eyebrow}}</span>
  <h1 class="mr-h1" style="margin:12px 0 0;font-family:Georgia, 'Times New Roman', serif;font-size:33px;line-height:37px;mso-line-height-rule:exactly;font-weight:normal;color:#1A1917">{{heading}}</h1>
  <p style="margin:14px 0 0;font-family:Arial, 'Helvetica Neue', Helvetica, sans-serif;font-size:15px;line-height:24px;mso-line-height-rule:exactly;color:#575550">{{body}}</p>
</td></tr>
<tr><td class="mr-pad" style="padding:24px 34px 0"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
<td align="center" bgcolor="#14554A" style="border-radius:6px;border:1px solid #14554A">
  <a href="{{action_url}}" style="display:block;padding:13px 24px;font-family:Arial, 'Helvetica Neue', Helvetica, sans-serif;font-size:15px;line-height:18px;mso-line-height-rule:exactly;font-weight:bold;color:#ffffff;text-decoration:none">{{cta_label}}</a>
</td></tr></table></td></tr>
<tr><td class="mr-pad" style="padding:20px 34px 0">
  <p style="margin:0;font-family:Arial, 'Helvetica Neue', Helvetica, sans-serif;font-size:13px;line-height:20px;mso-line-height-rule:exactly;color:#66635C">This link expires in {{expires_in}}. If the button doesn't work, paste this into your browser:</p>
  <p style="margin:8px 0 0;font-family:Arial, 'Helvetica Neue', Helvetica, sans-serif;font-size:12px;line-height:18px;mso-line-height-rule:exactly;color:#575550;word-break:break-all">{{action_url}}</p>
</td></tr>
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
    .split("{{preheader}}").join(escapeHtml(v.preheader))
    .split("{{eyebrow}}").join(escapeHtml(v.eyebrow))
    .split("{{heading}}").join(escapeHtml(v.heading))
    .split("{{body}}").join(escapeHtml(v.body))
    .split("{{cta_label}}").join(escapeHtml(v.ctaLabel))
    .split("{{action_url}}").join(escapeHtml(v.actionUrl))
    .split("{{disclaimer}}").join(escapeHtml(v.disclaimer))
    .split("{{expires_in}}").join(escapeHtml(v.expiresIn))
    .split("{{logo_url}}").join(escapeHtml(v.logoUrl))
    .split("{{postal_address}}").join(escapeHtml(v.postalAddress));

  /* A token left unfilled would ship "{{action_url}}" to a real inbox. The
     object above is typed, so a MISSING VALUE cannot happen — but a token
     added to the markup and not to the substitution list can, and this is the
     only thing that would catch it. src/lib/email/send.ts throws on the same
     condition, for the same reason. */
  const missed = html.match(/\{\{[a-z_]+\}\}/g);
  if (missed) throw new Error(`Email template has unfilled fields: ${[...new Set(missed)].join(", ")}`);

  return html;
}

/** "24 hours", "45 minutes". Rounded, because the exact second helps nobody. */
export function humanExpiry(expires: Date, now: number = Date.now()): string {
  const minutes = Math.max(1, Math.round((expires.getTime() - now) / 60_000));
  if (minutes < 90) return `${minutes} minute${minutes === 1 ? "" : "s"}`;
  const hours = Math.round(minutes / 60);
  return `${hours} hour${hours === 1 ? "" : "s"}`;
}

export function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    /* Deliberately fatal. The alternative is sending a real person a real
       email with a missing From address, or a footer with no postal address
       in it — which is the exact defect this file was written to end, and
       which looks fine right up until someone checks. */
    throw new Error(`${name} is not set on this Convex deployment (npx convex env set ${name} …).`);
  }
  return value;
}

/** Absolute, and a PNG: mail clients drop SVG, and a relative path has no page to be relative to. */
export function logoUrl(site: string): string {
  return `${site.replace(/\/$/, "")}/brand/meetrao-email-logo.png`;
}

async function deliver(to: string, subject: string, html: string): Promise<void> {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${required("AUTH_RESEND_KEY")}`,
      "Content-Type": "application/json",
    },
    // No List-Unsubscribe header. Both messages are transactional — see the
    // note above shell().
    body: JSON.stringify({ from: required("EMAIL_FROM"), to, subject, html }),
  });

  if (!response.ok) {
    /* Thrown rather than swallowed, because both callers are a person waiting
       on a screen that says "check your inbox". Failing the sign-in action
       shows them something went wrong; succeeding silently leaves them
       watching an inbox nothing was sent to. */
    throw new Error(`Resend refused the message (${response.status}): ${await response.text()}`);
  }
}

export type Rendered = { subject: string; html: string };

/* The pure half: no env, no network, no clock beyond the expiry handed in.
   Split out so src/lib/email/convex-templates.test.ts can render both messages
   and assert the things that are easy to lose by accident — an escaped value,
   an unfilled token, a missing postal address, a resurrected unsubscribe. */

export function renderVerify(input: {
  to: string;
  code: string;
  expires: Date;
  site: string;
  postalAddress: string;
  now?: number;
}): Rendered {
  const site = input.site.replace(/\/$/, "");
  /* The link carries the code to the page that can spend it. Convex Auth
     verifies with a CODE, not a link — there is no endpoint to click — so
     /verify reads these two params and submits them for the recipient. */
  const url = `${site}/verify?email=${encodeURIComponent(input.to)}&code=${encodeURIComponent(input.code)}`;
  const expiresIn = humanExpiry(input.expires, input.now);

  return {
    subject: "Confirm your email",
    html: shell({
      preheader: `Confirm your email to activate your Meetrao account. The link expires in ${expiresIn}.`,
      eyebrow: "Confirm your email",
      heading: "One click and you're in",
      body: "Confirm this address to activate your Meetrao account. Until you do, you can't sign in or share a booking link.",
      ctaLabel: "Confirm my email",
      actionUrl: url,
      disclaimer:
        "You received this because someone signed up for Meetrao with this address. If it was not you, ignore this email and no account will be created.",
      expiresIn,
      logoUrl: logoUrl(site),
      postalAddress: input.postalAddress,
    }),
  };
}

export function renderReset(input: {
  to: string;
  code: string;
  expires: Date;
  site: string;
  postalAddress: string;
  now?: number;
}): Rendered {
  const site = input.site.replace(/\/$/, "");
  // /reset already reads exactly these two params — see src/app/(auth)/reset.
  const url = `${site}/reset?email=${encodeURIComponent(input.to)}&code=${encodeURIComponent(input.code)}`;
  const expiresIn = humanExpiry(input.expires, input.now);

  return {
    subject: "Reset your Meetrao password",
    html: shell({
      preheader: `Choose a new Meetrao password. The link expires in ${expiresIn}.`,
      eyebrow: "Password reset",
      heading: "Choose a new password",
      body: "Open the link below to set a new password for your Meetrao account. Your current password keeps working until you do.",
      ctaLabel: "Set a new password",
      actionUrl: url,
      disclaimer:
        "You received this because someone asked to reset the password for this address. If it was not you, ignore this email — nothing has changed and your password is unaffected.",
      expiresIn,
      logoUrl: logoUrl(site),
      postalAddress: input.postalAddress,
    }),
  };
}

/* The impure half: read the deployment's configuration, render, hand to Resend. */

function context() {
  return { site: required("SITE_URL"), postalAddress: required("EMAIL_POSTAL_ADDRESS") };
}

export async function sendVerifyEmail(to: string, code: string, expires: Date): Promise<void> {
  const { subject, html } = renderVerify({ to, code, expires, ...context() });
  await deliver(to, subject, html);
}

export async function sendResetEmail(to: string, code: string, expires: Date): Promise<void> {
  const { subject, html } = renderReset({ to, code, expires, ...context() });
  await deliver(to, subject, html);
}
