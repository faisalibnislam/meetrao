import "server-only";

import { env, siteUrl } from "@/lib/env";

/* ─────────────────────────────────────────────────────────────────────────────
   Google OAuth — calendar access.

   Two separate concerns share one Google Cloud project, and confusing them
   costs a day:

     · "Sign in with Google" is Convex Auth's. Its callback is on the Convex
       deployment's own HTTP origin (…convex.site/api/auth/callback/google),
       not on this app.
     · Calendar access is ours. Its redirect URI is the route below and must be
       registered for EVERY origin — localhost, the Vercel preview domain and
       production. A missing one fails as redirect_uri_mismatch and nothing else.

   BOTH must be listed as authorised redirect URIs on the same OAuth client.
   Removing one to tidy up breaks the other.

   Writing needs calendar.events, because the guest is an attendee on the event
   rather than a line in its description. Expect a higher drop-off at the
   permission step than a read-only scope would see.

   Reading is freeBusy.query and nothing else, so calendar.freebusy is the
   scope for it. calendar.readonly was requested here and has been dropped: it
   added read of the calendar list and settings and bought nothing.

   Be careful about what this does and does not achieve. calendar.events is
   read AND write — it already permits reading every event's title, guests and
   description, and no scope grants attendee-writing without it. Verified
   against the live grant: with only events + freebusy, listing event details
   still returns 200.

   So the product's promise —

     "Meetrao reads only whether a period is busy or free. Never event titles,
      guests, descriptions, locations or attachments."   — /help, the FAQ, the footer

   is true of what this code does (busyPeriods is the only read, and it calls
   freeBusy — now from convex/lib/googleApi.ts), but it is not enforced by the
   grant, and Google's consent screen
   will describe the broader access. That gap is a copy decision, not a code
   one; it is listed in README.md under "Still open".
   ───────────────────────────────────────────────────────────────────────────── */

export const CALENDAR_SCOPES = [
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/calendar.freebusy",
  "https://www.googleapis.com/auth/userinfo.email",
];

export function redirectUri(): string {
  return `${siteUrl()}/api/google/callback`;
}

export function consentUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: env().GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri(),
    response_type: "code",
    scope: CALENDAR_SCOPES.join(" "),
    // offline + consent so a refresh token comes back every time, including on
    // a reconnect where Google would otherwise omit it.
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

/* The token exchange, the refresh, the revoke and every Calendar call used to
   live below this line. They are in convex/lib/googleApi.ts now, because that
   is where the refresh token lives and a token should be used where it is
   stored rather than handed back to the app. What is left here is the half
   that has to happen in the browser's address bar: the consent URL, and the
   redirect URI both halves are registered under. */
