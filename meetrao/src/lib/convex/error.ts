import { ConvexError } from "convex/values";

/**
 * The message a person should see, out of whatever Convex threw.
 *
 * Convex delivers a ConvexError's `data` to the client verbatim and redacts
 * everything else, a plain Error arrives as "Server Error" in production,
 * message and stack stripped. So anything without `data` is a bug on our side,
 * not something to paste into a form, and gets a generic line instead.
 */
export function convexMessage(e: unknown, fallback = "That did not work."): string {
  if (e instanceof ConvexError) {
    const data = e.data as { message?: string } | string | undefined;
    if (typeof data === "string") return data;
    if (data && typeof data.message === "string") return data.message;
  }
  return fallback;
}
