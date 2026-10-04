import { createHmac } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { hasComp, hasSubscription, isBusiness, isPro, planOf } from "@/convex/lib/plan";
import { verifyPolarSignature } from "@/lib/polar";

const read = (rel: string) => readFileSync(path.join(process.cwd(), rel), "utf8");

const HOUR = 3_600_000;

describe("who is on Pro", () => {
  it("is nobody, by default", () => {
    expect(planOf({ plan: undefined, plan_until: undefined })).toBe("free");
    expect(planOf({ plan: "free", plan_until: null })).toBe("free");
  });

  it("is anybody Polar says is paying", () => {
    expect(planOf({ plan: "pro", plan_until: Date.now() + HOUR })).toBe("pro");
  });

  /* A subscription with no end date is a live one. Treating absent as expired
     would turn Pro off for everybody the moment a payload shape changed. */
  it("stays on when no end date is known", () => {
    expect(isPro({ plan: "pro", plan_until: null })).toBe(true);
    expect(isPro({ plan: "pro", plan_until: undefined })).toBe(true);
  });

  /* Somebody who cancels on day two of a year they paid for has not stopped
     being a customer. They keep Pro until the period runs out. */
  it("survives a cancellation until the period ends", () => {
    expect(isPro({ plan: "pro", plan_until: Date.now() + HOUR })).toBe(true);
    expect(isPro({ plan: "pro", plan_until: Date.now() - HOUR })).toBe(false);
  });

  it("cannot be granted by a value that is not the word pro", () => {
    for (const value of ["PRO", "paid", "true", "", "premium"]) {
      expect(planOf({ plan: value, plan_until: null }), `${value} bought Pro`).toBe("free");
    }
  });
});

describe("Polar deliveries", () => {
  const SECRET = "whsec_" + Buffer.from("topsecret").toString("base64");
  const BODY = JSON.stringify({ type: "subscription.active", data: { id: "sub_1", status: "active" } });
  const ID = "msg_1";
  const NOW = Date.parse("2026-09-30T12:00:00.000Z");
  const TS = String(Math.floor(NOW / 1000));

  function sign(secret: Buffer, body = BODY, id = ID, ts = TS): string {
    return "v1," + createHmac("sha256", secret).update(`${id}.${ts}.${body}`).digest("base64");
  }

  const standardKey = Buffer.from(SECRET.replace(/^whsec_/, ""), "base64");
  const legacyKey = Buffer.from(SECRET, "utf8");

  it("accepts a signature under the current scheme", () => {
    const signature = sign(standardKey);
    expect(verifyPolarSignature({ secret: SECRET, body: BODY, headers: { id: ID, timestamp: TS, signature }, now: NOW })).toBe(true);
  });

  /* Polar changed scheme in September 2026 and their own SDK tries both keys.
     A webhook that verifies only under the scheme you guessed fails silently
     on the day the secret is rotated. */
  it("accepts a signature under the older scheme too", () => {
    const signature = sign(legacyKey);
    expect(verifyPolarSignature({ secret: SECRET, body: BODY, headers: { id: ID, timestamp: TS, signature }, now: NOW })).toBe(true);
  });

  it("refuses a body that was altered after signing", () => {
    const signature = sign(standardKey);
    const tampered = BODY.replace("sub_1", "sub_2");
    expect(verifyPolarSignature({ secret: SECRET, body: tampered, headers: { id: ID, timestamp: TS, signature }, now: NOW })).toBe(false);
  });

  it("refuses somebody else's secret", () => {
    const signature = sign(Buffer.from("not-the-secret"));
    expect(verifyPolarSignature({ secret: SECRET, body: BODY, headers: { id: ID, timestamp: TS, signature }, now: NOW })).toBe(false);
  });

  /* Without a freshness window a captured delivery replays forever, which is
     the entire reason the timestamp is inside the signed string. */
  it("refuses a delivery replayed hours later", () => {
    const signature = sign(standardKey);
    const later = NOW + 6 * HOUR;
    expect(verifyPolarSignature({ secret: SECRET, body: BODY, headers: { id: ID, timestamp: TS, signature }, now: later })).toBe(false);
  });

  it("refuses when a header is missing", () => {
    const signature = sign(standardKey);
    expect(verifyPolarSignature({ secret: SECRET, body: BODY, headers: { id: null, timestamp: TS, signature }, now: NOW })).toBe(false);
    expect(verifyPolarSignature({ secret: SECRET, body: BODY, headers: { id: ID, timestamp: null, signature }, now: NOW })).toBe(false);
    expect(verifyPolarSignature({ secret: SECRET, body: BODY, headers: { id: ID, timestamp: TS, signature: null }, now: NOW })).toBe(false);
  });
});

describe("only the webhook grants Pro", () => {
  const billing = read("convex/billing.ts");
  const route = read("src/app/api/polar/webhook/route.ts");

  it("guards the guard", () => {
    expect(billing).toContain("applyPolarSubscription");
  });

  /* A plan that any signed-in mutation can set is a plan anybody can set by
     finding that mutation. One writer, and it is behind a signature check. */
  it("has exactly one writer of the plan field", () => {
    const writers = globWrites();
    expect(writers, `plan is written in ${writers.join(", ")}`).toEqual(["convex/billing.ts"]);
  });

  it("verifies before it parses", () => {
    // A signature over a re-serialised object is a signature over something
    // else, so the raw text is what gets checked.
    expect(route.indexOf("verifyPolarSignature")).toBeLessThan(route.indexOf("JSON.parse"));
    expect(route).toContain("await request.text()");
  });

  it("refuses everything when no secret is configured", () => {
    expect(route).toMatch(/if \(!secret\) return NextResponse\.json\([^)]*503/);
  });

  it("keeps Pro on while a payment is being retried", () => {
    // Polar retries a failed renewal for days. Turning the product off
    // mid-retry punishes an expired card rather than a departure.
    expect(billing).toMatch(/PAID = \[.*past_due.*\]/);
  });
});

/**
 * Every file that WRITES a plan other than "free", so a second writer shows up
 * here rather than in production.
 *
 * Looks inside db.patch and db.insert calls rather than scanning for the word
 * `plan:` anywhere. Two near-misses taught this: the first version used one
 * regex over the file and `\s*` backtracked, so `plan: "free"` matched the
 * exemption it was meant to escape; the second flagged convex/admin.ts, where
 * a QUERY returns `plan: planOf(p)`. a read, reported as a grant.
 */
/**
 * The text between a call's brackets, and nothing after them.
 *
 * This used to take a fixed 600 characters from the call, which reached past
 * the end of the statement: a `return { plan: tier }` several lines below a
 * patch counted as that patch writing the plan. A fixed window is only ever
 * right by luck, and when it is wrong it is wrong in the direction that
 * accuses working code.
 */
function argsOf(text: string, openParen: number): string {
  let depth = 0;
  for (let i = openParen; i < text.length; i++) {
    const c = text[i];
    if (c === "(") depth++;
    else if (c === ")") {
      depth--;
      if (depth === 0) return text.slice(openParen + 1, i);
    }
  }
  return text.slice(openParen + 1);
}

function globWrites(): string[] {
  const files = ["convex/billing.ts", "convex/profiles.ts", "convex/admin.ts", "convex/teams.ts", "convex/apiKeys.ts"];

  return files.filter((f) => {
    const text = read(f);
    const writes = [...text.matchAll(/ctx\.db\.(patch|insert)\(/g)];

    return writes.some((match) => {
      // The call's arguments, exactly: balanced to the closing bracket.
      const from = match.index ?? 0;
      const body = argsOf(text, from + match[0].length - 1);
      /* Both forms: `plan: something` and the shorthand `plan,`. Billing.ts
         uses the shorthand, so a pattern that only knew the first found
         nothing anywhere and passed by being blind. */
      /* `\bplan` also matched `comp_plan`, which is a GRANT's tier and not
         the subscription field this guard is about. A grant is written by the
         admin console on purpose; what must have one writer is the plan Polar
         pays for. The lookbehind keeps the word boundary and rules out any
         field merely ending in "plan". */
      const assignment = /(?<![a-z_])plan\s*(?::\s*([^,\n]+)|,)/.exec(body);
      if (!assignment) return false;

      const value = (assignment[1] ?? "shorthand").trim();
      // Creating a profile as free is not a grant.
      return !value.startsWith('"free"');
    });
  });
}

describe("Pro given away", () => {
  const admin = read("convex/admin.ts");
  const HOUR = 3_600_000;

  /* A grant is read BESIDE the subscription, never instead of it. The whole
     point of the separation is that nothing inside the app can write `plan`,
     so a granted account and a paying one stay distinguishable, to the
     product, and to anybody counting revenue. */
  it("makes somebody Pro without touching the plan field", () => {
    const granted = { plan: "free", plan_until: null, comp_until: Date.now() + HOUR };
    expect(isPro(granted)).toBe(true);
    expect(hasSubscription(granted), "a grant must not read as a subscription").toBe(false);
    expect(hasComp(granted)).toBe(true);
  });

  it("expires by itself", () => {
    expect(isPro({ plan: "free", plan_until: null, comp_until: Date.now() - HOUR })).toBe(false);
    expect(isPro({ plan: "free", plan_until: null, comp_until: null })).toBe(false);
    expect(isPro({ plan: "free", plan_until: null, comp_until: undefined })).toBe(false);
  });

  /* Somebody granted Pro who then subscribes has both. Removing the grant must
     leave them Pro. The admin screen says so, and this is why. */
  it("does not take Pro away from somebody who also pays", () => {
    const both = { plan: "pro", plan_until: Date.now() + HOUR, comp_until: Date.now() - HOUR };
    expect(isPro(both)).toBe(true);
  });

  it("is written only by an admin-gated mutation, and always logged", () => {
    for (const fn of ["grantPro", "revokePro"]) {
      const from = admin.indexOf(`export const ${fn}`);
      expect(from, `${fn} has moved or been renamed`).toBeGreaterThan(-1);
      const body = admin.slice(from, admin.indexOf("\n});", from));
      expect(body, `${fn} does not check for an admin`).toContain("requireAdmin(ctx)");
      expect(body, `${fn} does not write an activity row`).toContain("logActivity");
    }
  });

  /* "Who gave this account Pro, and why" is asked months later, by which time
     the operator has forgotten. A grant with no reason is one nobody can
     review, so the mutation refuses it. */
  it("refuses a grant with no reason", () => {
    const body = admin.slice(admin.indexOf("export const grantPro"));
    expect(body).toContain("Say why this account is getting Pro.");
  });

  it("offers only the lengths it knows", () => {
    expect(admin).toMatch(/COMP_DAYS: Record<string, number \| null>/);
    expect(admin).toContain("Pick one of the offered lengths.");
  });
});

/* ─────────────────────────────────────────────────────────────────────────────
   The third tier.

   Business is a SUPERSET of Pro, so the thing most worth asserting is not that
   `planOf` returns the new string. It is that every gate already written
   against Pro keeps letting a Business account through. There are dozens of
   `requirePro` calls and none of them were touched when Business was added;
   if `isPro` ever goes back to an equality check, they all start refusing the
   most expensive customers the product has.
   ───────────────────────────────────────────────────────────────────────────── */
describe("who is on Business", () => {
  const live = { plan: "business", plan_until: Date.now() + HOUR };

  it("is anybody Polar says bought it", () => {
    expect(planOf(live)).toBe("business");
    expect(isBusiness(live)).toBe(true);
  });

  it("passes every gate written for Pro", () => {
    expect(isPro(live)).toBe(true);
  });

  it("is not granted by a Pro subscription", () => {
    const pro = { plan: "pro", plan_until: Date.now() + HOUR };
    expect(isBusiness(pro)).toBe(false);
    expect(isPro(pro)).toBe(true);
  });

  it("ends when the period it was paid for ends", () => {
    expect(planOf({ plan: "business", plan_until: Date.now() - HOUR })).toBe("free");
  });

  it("survives an absent end date, like Pro does", () => {
    expect(planOf({ plan: "business", plan_until: null })).toBe("business");
    expect(hasSubscription({ plan: "business", plan_until: undefined })).toBe(true);
  });

  /* `comp_until` is one date with no tier beside it. Reading Business out of a
     field that does not carry a tier is how a free grant quietly becomes the
     most expensive plan, so a grant stops at Pro. */
  it("is never granted by a complimentary date alone", () => {
    const comped = { plan: "free", plan_until: null, comp_until: Date.now() + HOUR };
    expect(hasComp(comped)).toBe(true);
    expect(planOf(comped)).toBe("pro");
    expect(isBusiness(comped)).toBe(false);
  });

  /* A lapsed Business subscription with a live grant falls back to Pro rather
     than to free: the grant is still real. */
  it("falls back to a live grant when the subscription lapses", () => {
    expect(planOf({ plan: "business", plan_until: Date.now() - HOUR, comp_until: Date.now() + HOUR })).toBe("pro");
  });
});
