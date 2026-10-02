import { NextResponse, type NextRequest } from "next/server";
import { presentedKeyHash, touch, unauthorized } from "@/lib/api/auth";
import { convexAnonymous } from "@/lib/convex/server";
import { api } from "@/convex/_generated/api";

export const dynamic = "force-dynamic";

/** GET /api/v1/meetings, the meeting types this key's account offers. */
export async function GET(request: NextRequest) {
  const hash = await presentedKeyHash(request);
  if (!hash) return unauthorized();

  const rows = await convexAnonymous().query(api.apiPublic.meetings, { hash });
  if (rows === null) return unauthorized();
  touch(hash);

  return NextResponse.json({ object: "list", data: rows }, { headers: { "Cache-Control": "no-store" } });
}
