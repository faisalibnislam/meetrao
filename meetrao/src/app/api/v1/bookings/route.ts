import { NextResponse, type NextRequest } from "next/server";
import { presentedKeyHash, touch, unauthorized } from "@/lib/api/auth";
import { convexAnonymous } from "@/lib/convex/server";
import { api } from "@/convex/_generated/api";

export const dynamic = "force-dynamic";

/* ─────────────────────────────────────────────────────────────────────────────
   GET /api/v1/bookings, this key's own bookings.

   Read-only, like the rest of v1: nothing here creates, moves or cancels
   anything. Every booking rule in this product is enforced at a door built for
   guests, and a write API would be a second door that has to enforce all of
   them again.

   `from` and `to` are ISO instants and default to the last thirty days plus
   ninety ahead. `limit` is capped at 200. a caller who wants everything pages
   with `from`, which keeps one request from reading a whole history.
   ───────────────────────────────────────────────────────────────────────────── */

function instant(value: string | null): number | undefined {
  if (!value) return undefined;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? undefined : parsed;
}

/* `?limit=abc` is NaN, which survives Convex's number validator and the
   clamp after it (Math.max(NaN, 1) is NaN), and took the query down with a
   500. Anything that is not a finite number is the default. */
function count(value: string | null): number | undefined {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export async function GET(request: NextRequest) {
  const hash = await presentedKeyHash(request);
  if (!hash) return unauthorized();

  const params = request.nextUrl.searchParams;
  const rows = await convexAnonymous().query(api.apiPublic.bookings, {
    hash,
    from: instant(params.get("from")),
    to: instant(params.get("to")),
    limit: count(params.get("limit")),
  });

  // null means the key resolved to nobody, same answer as no key at all.
  if (rows === null) return unauthorized();
  touch(hash);

  return NextResponse.json(
    { object: "list", data: rows, has_more: rows.length >= 200 },
    { headers: { "Cache-Control": "no-store" } },
  );
}
