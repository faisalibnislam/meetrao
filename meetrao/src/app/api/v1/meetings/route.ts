import { NextResponse, type NextRequest } from "next/server";
import { presentedKey, touch, unauthorized } from "@/lib/api/auth";
import { convexAnonymous } from "@/lib/convex/server";
import { api } from "@/convex/_generated/api";

export const dynamic = "force-dynamic";

/** GET /api/v1/meetings, the meeting types this key's account offers. */
export async function GET(request: NextRequest) {
  const key = presentedKey(request);
  if (!key) return unauthorized();

  const rows = await convexAnonymous().query(api.apiPublic.meetings, { key });
  if (rows === null) return unauthorized();
  touch(key);

  return NextResponse.json({ object: "list", data: rows }, { headers: { "Cache-Control": "no-store" } });
}
