import { ConvexError } from "convex/values";

/* ─────────────────────────────────────────────────────────────────────────────
   User-facing failures.

   A plain `throw new Error("You already have a contact with that email.")`
   works in a dev deployment and then LIES in production: Convex strips the
   message and the client sees "Server Error". Only a ConvexError's `data`
   crosses that boundary intact.

   So every message a person is meant to read goes through `fail`. A plain
   Error is still right for genuine bugs — those SHOULD be opaque to the client
   and loud in the logs.
   ───────────────────────────────────────────────────────────────────────────── */

export type Failure = { message: string; code: string };

export function fail(message: string, code = "INVALID"): never {
  throw new ConvexError({ message, code } satisfies Failure);
}
