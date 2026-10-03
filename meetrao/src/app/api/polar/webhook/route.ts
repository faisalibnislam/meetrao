import { NextResponse, type NextRequest } from "next/server";
import { verifyPolarSignature } from "@/lib/polar";
import { convexAnonymous } from "@/lib/convex/server";
import { env } from "@/lib/env";
import { api } from "@/convex/_generated/api";

export const dynamic = "force-dynamic";

/* ─────────────────────────────────────────────────────────────────────────────
   Polar's webhook: the one thing that grants or removes Pro.

   Nothing else writes a plan. Not the checkout return (a browser can be sent
   to a success URL by anyone) and not a client callback. A plan is a claim
   about money and the only party that knows is the one that took it.

   REJECT FIRST, PARSE SECOND. The body is read as text and verified before it
   is treated as JSON, because a signature over a re-serialised object is a
   signature over something else.

   A delivery that cannot be verified gets 401 and no detail. A delivery for
   somebody who is not a host here gets 200, because it is not Polar's problem
   that an organisation sells other things, answering anything else would
   have them retry it forever.
   ───────────────────────────────────────────────────────────────────────────── */

type SubscriptionEvent = {
  type: string;
  data?: {
    id?: string;
    status?: string;
    current_period_end?: string | null;
    ends_at?: string | null;
    customer_id?: string | null;
    customer?: { id?: string | null; external_id?: string | null; email?: string | null } | null;
    /* Which product was bought, and therefore which tier. Polar sends it flat
       on some events and nested on others, so both are read. */
    product_id?: string | null;
    product?: { id?: string | null } | null;
    external_customer_id?: string | null;
    metadata?: Record<string, unknown> | null;
  };
};

function profileIdOf(event: SubscriptionEvent): string | null {
  const data = event.data ?? {};
  const fromMetadata = typeof data.metadata?.profile_id === "string" ? (data.metadata.profile_id as string) : null;
  return data.external_customer_id ?? data.customer?.external_id ?? fromMetadata ?? null;
}

export async function POST(request: NextRequest) {
  const secret = env().POLAR_WEBHOOK_SECRET;
  // No secret configured means no verifiable deliveries, so none are accepted.
  if (!secret) return NextResponse.json({ error: "not configured" }, { status: 503 });

  const body = await request.text();
  const ok = verifyPolarSignature({
    secret,
    body,
    headers: {
      id: request.headers.get("webhook-id"),
      timestamp: request.headers.get("webhook-timestamp"),
      signature: request.headers.get("webhook-signature"),
    },
  });
  if (!ok) return NextResponse.json({ error: "bad signature" }, { status: 401 });

  let event: SubscriptionEvent;
  try {
    event = JSON.parse(body) as SubscriptionEvent;
  } catch {
    return NextResponse.json({ error: "bad body" }, { status: 400 });
  }

  /* Only subscription events change a plan. `subscription.updated` is Polar's
     catch-all and carries the current status, so handling the family by prefix
     means a new member of it (paused, migrated) is already handled. */
  if (!event.type?.startsWith("subscription.")) {
    return NextResponse.json({ ok: true, ignored: event.type ?? "unknown" });
  }

  const data = event.data ?? {};
  if (!data.id || !data.status) return NextResponse.json({ ok: true, ignored: "incomplete" });

  const endsAt = data.current_period_end ?? data.ends_at ?? null;
  const result = await convexAnonymous().mutation(api.billing.applyPolarSubscription, {
    profileId: profileIdOf(event),
    customerId: data.customer_id ?? data.customer?.id ?? null,
    subscriptionId: data.id,
    status: data.status,
    currentPeriodEnd: endsAt ? Date.parse(endsAt) : null,
    productId: data.product_id ?? data.product?.id ?? null,
  });

  return NextResponse.json({ ok: true, ...result });
}
