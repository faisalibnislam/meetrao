/**
 * Why a Google Calendar connection failed, in the host's terms.
 *
 * /api/google/callback distinguishes these deliberately rather than reporting
 * one generic failure, because the fixes are completely different: telling
 * someone to "allow calendar access" when the real problem is that they are not
 * on the OAuth app's test-user list sends them round the same loop forever.
 *
 * `status` comes from `?calendar=`, `reason` from `?reason=` (Google's own
 * error code, already shape-checked by the callback).
 */
export type CalendarFailure = { title: string; body: string };

export function calendarFailure(
  status: string | undefined,
  reason?: string,
): CalendarFailure | null {
  if (status === "denied") {
    if (reason === "access_denied") {
      return {
        title: "Google blocked the connection",
        body: "Either consent was declined, or this Google account is not on the OAuth app's test-user list while it is in Testing. Add it under Audience → Test users in the Google Cloud console, then try again.",
      };
    }
    if (reason === "admin_policy_enforced" || reason === "org_internal") {
      return {
        title: "Your Google admin blocked this",
        body: "The Workspace policy on this account does not allow connecting Meetrao. An administrator has to allow the app.",
      };
    }
    return {
      title: "Couldn't connect to Google",
      body: reason
        ? `Google refused the request (${reason}). Try again and allow calendar access.`
        : "Google didn't confirm the permission. Try again and allow calendar access.",
    };
  }

  if (status === "session") {
    return {
      title: "The connection timed out",
      body: "The sign-in took too long, or your browser dropped the cookie that ties the two halves together. Start the connection again and finish it in the same tab.",
    };
  }

  if (status === "norefresh") {
    return {
      title: "Google didn't grant lasting access",
      body: "The permission came back without a refresh token, so it would stop working within the hour. Remove Meetrao under your Google account's third-party access, then connect again.",
    };
  }

  if (status === "failed") {
    return {
      title: "Couldn't connect to Google",
      body: "Something went wrong finishing the connection. Try again — if it keeps happening, the server logs have the detail.",
    };
  }

  return null;
}
