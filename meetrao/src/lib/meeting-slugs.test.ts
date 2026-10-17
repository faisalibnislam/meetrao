import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  MAX_PREVIOUS_SLUGS,
  clashMessage,
  findBySlug,
  movedTo,
  previousSlugsAfter,
  sanitiseSlugInput,
  slugClash,
  slugProblem,
  uniqueSlug,
  type SlugHolder,
} from "@/convex/lib/meetingSlugs";

/* ─────────────────────────────────────────────────────────────────────────────
   A meeting's link can move, and its old links keep working.

   THE DEFECT: a meeting renamed to "Meeting" at 45 minutes still lived at
   /30-minute-consultation, because the editor had no link field and nothing
   ever moved a slug. Letting it move is easy; the part that matters is that
   every copy of the old address already pasted into a signature or somebody
   else's calendar keeps reaching the same meeting, and never a different one.

   So these pin three things: the history a move leaves behind, the rule that
   an old link still counts as taken for the host's OTHER meetings, and the
   lookup and redirect that send an old address on to the current one.
   ───────────────────────────────────────────────────────────────────────────── */

const consult: SlugHolder = {
  id: "m1",
  name: "Meeting",
  slug: "meeting",
  previous_slugs: ["30-minute-consultation"],
};
const coffee: SlugHolder = { id: "m2", name: "Coffee chat", slug: "coffee-chat" };
const mine = [consult, coffee];

describe("the history a move leaves behind", () => {
  it("remembers the slug it left", () => {
    expect(previousSlugsAfter(undefined, "30-minute-consultation", "meeting")).toEqual(["30-minute-consultation"]);
  });

  it("keeps older ones, newest last", () => {
    expect(previousSlugsAfter(["a"], "b", "c")).toEqual(["a", "b"]);
  });

  /* Going back to an old link: the meeting answers there directly now, and
     must not also redirect from it to itself. */
  it("drops the slug it returns to", () => {
    expect(previousSlugsAfter(["a", "b"], "c", "a")).toEqual(["b", "c"]);
  });

  it("is unchanged when the slug did not move", () => {
    expect(previousSlugsAfter(["a"], "b", "b")).toEqual(["a"]);
  });

  it("does not repeat a slug it already holds", () => {
    expect(previousSlugsAfter(["a", "b"], "a", "c")).toEqual(["b", "a"]);
  });

  it("forgets the oldest past the cap, not the newest", () => {
    const long = Array.from({ length: MAX_PREVIOUS_SLUGS }, (_, i) => `s${i}`);
    const after = previousSlugsAfter(long, "now", "next");
    expect(after).toHaveLength(MAX_PREVIOUS_SLUGS);
    expect(after.at(-1)).toBe("now");
    expect(after).not.toContain("s0");
  });
});

describe("an old link still counts as taken", () => {
  it("for another meeting's current slug", () => {
    const clash = slugClash("coffee-chat", mine, "m1");
    expect(clash?.meeting.id).toBe("m2");
    expect(clash?.previous).toBe(false);
  });

  /* The case the history exists for: if another meeting could claim the old
     address, pasted links would start opening the wrong meeting. */
  it("for another meeting's OLD slug", () => {
    const clash = slugClash("30-minute-consultation", mine, "m2");
    expect(clash?.meeting.id).toBe("m1");
    expect(clash?.previous).toBe(true);
    expect(clashMessage(clash!)).toContain("still forwards");
  });

  it("but not for the meeting's own history", () => {
    expect(slugClash("30-minute-consultation", mine, "m1")).toBeNull();
  });

  it("nor its own current slug", () => {
    expect(slugClash("meeting", mine, "m1")).toBeNull();
  });

  it("for a meeting that does not exist yet, everything counts", () => {
    expect(slugClash("meeting", mine)).not.toBeNull();
    expect(slugClash("30-minute-consultation", mine)).not.toBeNull();
  });

  it("compares case-insensitively", () => {
    expect(slugClash("  Coffee-Chat ", mine, "m1")?.meeting.id).toBe("m2");
  });
});

describe("a free slug for a new meeting", () => {
  it("skips current and previous slugs alike", () => {
    expect(uniqueSlug("coffee-chat", mine)).toBe("coffee-chat-2");
    expect(uniqueSlug("30-minute-consultation", mine)).toBe("30-minute-consultation-2");
  });

  it("is the base itself when free", () => {
    expect(uniqueSlug("intro-call", mine)).toBe("intro-call");
  });

  it("stays inside 80 characters when a suffix is needed", () => {
    const base = "a".repeat(80);
    const taken: SlugHolder[] = [{ id: "x", name: "Long", slug: base }];
    const next = uniqueSlug(base, taken);
    expect(next.length).toBeLessThanOrEqual(80);
    expect(slugProblem(next)).toBeNull();
  });
});

describe("the Link field's rules", () => {
  it("turns spaces into hyphens as it is typed", () => {
    expect(sanitiseSlugInput("Intro Call!")).toBe("intro-call");
  });

  it.each([
    ["", "Give the meeting a link."],
    ["-intro", "can't start or end"],
    ["intro-", "can't start or end"],
  ])("refuses %j", (raw, message) => {
    expect(slugProblem(raw)).toContain(message);
  });

  it("accepts an ordinary slug", () => {
    expect(slugProblem("intro-call")).toBeNull();
  });
});

describe("an old address finds the meeting", () => {
  it("by its current slug, not moved", () => {
    expect(findBySlug(mine, "meeting")).toEqual({ meeting: consult, moved: false });
  });

  it("by an old slug, marked moved", () => {
    expect(findBySlug(mine, "30-minute-consultation")).toEqual({ meeting: consult, moved: true });
  });

  /* Rows written before the clash check could in principle hold another
     meeting's current slug in their history; the live slug must win. */
  it("prefers a current slug over somebody's history", () => {
    const stale: SlugHolder = { id: "m3", name: "Old", slug: "old", previous_slugs: ["coffee-chat"] };
    expect(findBySlug([stale, coffee], "coffee-chat")?.meeting.id).toBe("m2");
  });

  it("finds nothing for a slug nobody ever had", () => {
    expect(findBySlug(mine, "nope")).toBeNull();
    expect(findBySlug(mine, "")).toBeNull();
  });
});

describe("the redirect", () => {
  it("names the current slug under the same base", () => {
    expect(movedTo("30-minute-consultation", { slug: "meeting" }, "/faisal")).toBe("/faisal/meeting");
    expect(movedTo("old", { slug: "new" }, "/acme/faisal/")).toBe("/acme/faisal/new");
  });

  it("is nothing when the slug is current, whatever its case", () => {
    expect(movedTo("meeting", { slug: "meeting" }, "/faisal")).toBeNull();
    expect(movedTo("Meeting", { slug: "meeting" }, "/faisal")).toBeNull();
  });

  it("is nothing when there is no meeting", () => {
    expect(movedTo("gone", null, "/faisal")).toBeNull();
  });
});

/* The wiring, read from source because none of it runs without Convex and a
   request. Each line is one of the places the history has to be honoured; a
   refactor that drops one would leave old links 404ing or a slug stealable
   with every unit test above still green. */
describe("the wiring", () => {
  const read = (rel: string) => readFileSync(path.join(process.cwd(), rel), "utf8");
  const schema = read("convex/schema.ts");
  const mutation = read("convex/meetingTypes.ts");
  const publicBooking = read("convex/publicBooking.ts");
  const personal = read("src/app/(public)/[username]/[slug]/page.tsx");
  const company = read("src/app/(public)/[username]/[slug]/[meeting]/page.tsx");

  it("stores the history on the meeting", () => {
    expect(schema).toContain("previous_slugs: v.optional(v.array(v.string()))");
  });

  it("records the old slug when update moves it", () => {
    const update = mutation.slice(mutation.indexOf("export const update ="));
    expect(update).toContain("previousSlugsAfter(m.previous_slugs, m.slug, patch.slug as string)");
    expect(update).toContain("assertSlugFree(ctx, m.user_id, patch.slug as string, m.id)");
  });

  it("checks old slugs when create picks one", () => {
    const create = mutation.slice(mutation.indexOf("export const create ="), mutation.indexOf("export const update ="));
    expect(create).toContain("assertSlugFree(ctx, me.id, row.slug, null)");
  });

  it("resolves old slugs in every personal public lookup", () => {
    expect(publicBooking).toContain("findBySlug(mine, slug)");
    for (const name of ["meetingIsOnCompany", "getMeetingAvailability", "companyPlaceOf", "createBooking"]) {
      const at = publicBooking.indexOf(`export const ${name} =`);
      expect(at, name).toBeGreaterThan(-1);
      const body = publicBooking.slice(at, publicBooking.indexOf("\n});", at));
      expect(body, `${name} reads by slug without the history`).toContain("meetingAtSlug(ctx, host.id, a.slug)");
    }
  });

  it("redirects permanently from both public routes", () => {
    expect(personal).toContain("movedTo(slug, await getPublicMeeting(username, slug), `/${username}`)");
    expect(personal).toContain("permanentRedirect(moved)");
    expect(company).toContain("movedTo(found.slug, meeting, base)");
    expect(company).toContain("permanentRedirect(moved)");
  });
});
