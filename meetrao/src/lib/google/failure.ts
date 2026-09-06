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

/**
 * The deployment is missing something, as opposed to the host doing something
 * wrong. Rendered amber rather than red: nothing the host can fix.
 *
 * Two different things can be missing, and they fail at opposite ends of the
 * flow — the OAuth client before the host ever reaches Google, the service-role
 * key only when the returned tokens are saved. Naming which one is missing is
 * the whole point of this message.
 */
export function calendarUnconfigured(reason?: string): string | null {
  if (reason === "storage") {
    return "Google Calendar can't be stored on this deployment: SUPABASE_SERVICE_ROLE_KEY is not set. Calendar tokens live behind the service role, so the connection cannot be saved without it.";
  }
  return "Google Calendar is not configured on this deployment. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET, then try again.";
}

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

  // Google accepted the consent and then rejected the token exchange. Its own
  // error code says which of the three moving parts is wrong, and each has a
  // different fix, so none of them should read as "try again".
  if (status === "exchange") {
    if (reason === "redirect_uri_mismatch") {
      return {
        title: "The redirect URI doesn't match",
        body: "Google requires the redirect URI in the token exchange to match one registered on the OAuth client, exactly. Add this deployment's <site>/api/google/callback under Credentials → your Web application client, with no trailing slash.",
      };
    }
    if (reason === "invalid_client") {
      return {
        title: "Google rejected the app's credentials",
        body: "GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET do not form a valid pair for this OAuth client — usually a stale secret, or one saved to the wrong environment. Check both on the deployment, then redeploy so the new values are picked up.",
      };
    }
    if (reason === "invalid_grant") {
      return {
        title: "That authorisation expired",
        body: "Google's one-time code is only valid for a few minutes and only once. Start the connection again and finish it without reloading or going back.",
      };
    }
    return {
      title: "Google rejected the token exchange",
      body: `Google refused to issue a token (${reason ?? "no code given"}). The server logs carry its full description.`,
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
    if (reason === "network") {
      return {
        title: "Couldn't reach Google",
        body: "The request to Google's token endpoint never completed. That is usually a transient network fault on the server — try again in a moment.",
      };
    }
    if (reason === "bad_response") {
      return {
        title: "Google sent something unreadable",
        body: "The token endpoint replied with a body that is not JSON, which normally means a proxy or captive portal answered instead of Google.",
      };
    }
    if (reason === "config") {
      return {
        title: "The deployment is missing a setting",
        body: "An environment variable the connection needs is not set on this deployment. The server logs name which one.",
      };
    }
    if (reason === "storage_write") {
      return {
        title: "The connection couldn't be saved",
        body: "Google returned the tokens, but writing them to calendar_connections failed. The server logs carry the database error.",
      };
    }
    return {
      title: "Couldn't connect to Google",
      body: `Something went wrong finishing the connection${reason ? ` (${reason})` : ""}. Try again — if it keeps happening, the server logs have the detail.`,
    };
  }

  return null;
}

/**
 * Classify an exception that is not a GoogleAuthError into a short, safe token
 * for the URL. Deliberately coarse: an error *message* can carry a token or a
 * connection string, so only the failure's shape travels — the message itself
 * stays in the server log.
 */
export function classifyFailure(cause: unknown): string {
  if (cause instanceof TypeError) return "network";
  if (cause instanceof SyntaxError) return "bad_response";

  if (cause instanceof Error) {
    if (cause.message.startsWith("Missing environment variable")) {
      return "config";
    }
    if (cause.message.startsWith("Could not store the calendar connection")) {
      return "storage_write";
    }
  }
  return "unknown";
}
