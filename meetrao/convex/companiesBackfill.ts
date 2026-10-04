import { internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { uuid } from "./lib/ids";
import { planOf } from "./lib/plan";
import { limitsFor } from "./lib/limits";
import type { Doc } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";

/* ─────────────────────────────────────────────────────────────────────────────
   Moving per-profile branding and domains into companies.

   This is the one step in the companies work that touches live paying
   customers, so it is built to be run twice, inspected before it writes, and
   survivable if it is wrong.

   THREE PROPERTIES, AND EACH IS LOAD-BEARING.

   1. DRY RUN FIRST. `dryRun: true` reports exactly what it would do and writes
      nothing. The report is the thing to read before the real run, because
      the database it is about to change is somebody's live booking page.

   2. IDEMPOTENT. Running it again is a no-op. It skips a company that already
      carries the field it would set, so a half-finished run can simply be run
      again rather than reasoned about.

   3. IT COPIES; IT DOES NOT MOVE. The profile columns stay exactly as they
      are and keep serving every public page until step 5 switches the reads.
      That is what makes this reversible: if the companies turn out wrong,
      deleting them puts the product back where it was.

   THE ONE THING IT DOES TAKE AWAY is `brand_logo_storage_id` on the profile,
   and only once the company holds it. Two rows pointing at one stored file is
   a trap: `branding.removeLogo` deletes the file it finds, so clearing a logo
   on the old screen would delete the file the company's page is serving. The
   profile keeps `brand_logo_url`, so its own page still renders, and the file
   now has exactly one owner.
   ───────────────────────────────────────────────────────────────────────────── */

type Plan = ReturnType<typeof planOf>;

type Report = {
  dryRun: boolean;
  scanned: number;
  /** One line per profile that has something to move. */
  actions: string[];
  created: number;
  updated: number;
  skipped: string[];
};

/** A company name from somebody's own details, never a generated string. */
function companyNameFor(p: Doc<"profiles">): string {
  const name = (p.full_name || "").trim();
  if (name) return name.length > 60 ? name.slice(0, 60) : name;
  return p.username;
}

async function slugIsFree(ctx: MutationCtx, slug: string): Promise<boolean> {
  const host = await ctx.db
    .query("profiles")
    .withIndex("by_username_lower", (q) => q.eq("username_lower", slug))
    .unique();
  if (host) return false;
  const team = await ctx.db
    .query("teams")
    .withIndex("by_slug_lower", (q) => q.eq("slug_lower", slug))
    .unique();
  if (team) return false;
  const company = await ctx.db
    .query("companies")
    .withIndex("by_slug_lower", (q) => q.eq("slug_lower", slug))
    .unique();
  return !company;
}

export const backfill = internalMutation({
  args: { dryRun: v.optional(v.boolean()) },
  handler: async (ctx, a): Promise<Report> => {
    const dryRun = a.dryRun !== false;
    const report: Report = { dryRun, scanned: 0, actions: [], created: 0, updated: 0, skipped: [] };

    const profiles = await ctx.db.query("profiles").collect();

    for (const p of profiles) {
      report.scanned++;

      const hasBranding = Boolean(p.brand_logo_url || p.brand_color || p.brand_bg);
      const hasDomain = Boolean(p.custom_domain);
      if (!hasBranding && !hasDomain) continue;

      const plan: Plan = planOf(p);
      const limits = limitsFor(plan);

      const owned = await ctx.db
        .query("companies")
        .withIndex("by_owner", (q) => q.eq("owner_id", p.id))
        .collect();

      let company: Doc<"companies"> | null = owned[0] ?? null;

      if (!company) {
        /* A lapsed account still gets its company made. The rows survive a
           plan ending so that coming back costs nothing, and refusing to
           create one here would lose their branding instead of parking it.
           The cap is about creating NEW companies, not about keeping what
           somebody already had. */
        if (limits.companies < 1) {
          report.actions.push(`${p.username}: creating a company although the plan is ${plan} (keeps their branding)`);
        }

        let slug = p.username.toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-|-$/g, "");
        /* The username is taken by the host themselves, so it can never be
           free. Suffix until something is, rather than failing the run. */
        let n = 0;
        while (!(await slugIsFree(ctx, slug)) && n < 50) {
          n++;
          slug = `${p.username.toLowerCase().replace(/[^a-z0-9-]+/g, "-")}-co${n > 1 ? n : ""}`;
        }
        if (!(await slugIsFree(ctx, slug))) {
          report.skipped.push(`${p.username}: could not find a free slug`);
          continue;
        }

        report.actions.push(`${p.username}: create company "${companyNameFor(p)}" (/${slug})`);
        report.created++;

        if (!dryRun) {
          const id = uuid();
          const now = Date.now();
          await ctx.db.insert("companies", {
            id,
            owner_id: p.id,
            name: companyNameFor(p),
            slug,
            slug_lower: slug,
            custom_domain: null,
            custom_domain_verified_at: null,
            brand_color: null,
            brand_background: null,
            brand_logo_url: null,
            brand_logo_storage_id: null,
            created_at: now,
            updated_at: now,
          });
          await ctx.db.insert("company_members", {
            id: uuid(),
            company_id: id,
            user_id: p.id,
            role: "owner",
            handle: p.username,
            handle_lower: p.username.toLowerCase(),
            created_at: now,
          });
          company = await ctx.db
            .query("companies")
            .withIndex("by_uuid", (q) => q.eq("id", id))
            .unique();
        }
      }

      // A dry run has no company to copy into; the report above is the output.
      if (!company) continue;

      /* Only fields the company does not already carry. An owner who has
         already set a colour on the company means this has effectively run,
         and overwriting it would undo their work. */
      const patch: Partial<Doc<"companies">> = {};
      if (p.brand_color && !company.brand_color) patch.brand_color = p.brand_color;
      if (p.brand_bg && !company.brand_background) patch.brand_background = p.brand_bg;
      if (p.brand_logo_url && !company.brand_logo_url) {
        patch.brand_logo_url = p.brand_logo_url;
        patch.brand_logo_storage_id = p.brand_logo_storage_id ?? null;
      }
      if (p.custom_domain && !company.custom_domain) {
        patch.custom_domain = p.custom_domain;
        patch.custom_domain_verified_at = p.custom_domain_verified_at ?? null;
      }

      if (Object.keys(patch).length === 0) {
        report.actions.push(`${p.username}: company "${company.name}" already carries everything`);
        continue;
      }

      report.actions.push(
        `${p.username}: copy ${Object.keys(patch).join(", ")} into company "${company.name}"`,
      );
      report.updated++;

      if (!dryRun) {
        await ctx.db.patch(company._id, { ...patch, updated_at: Date.now() });

        /* The profile stops OWNING the file once the company holds it. Two
           rows pointing at one stored file is a trap: removeLogo deletes what
           it finds, so clearing the logo on the old screen would delete the
           file the company's page is serving. brand_logo_url stays, so the
           old page still renders until step 5 switches the reads. */
        if (patch.brand_logo_storage_id && p.brand_logo_storage_id) {
          await ctx.db.patch(p._id, { brand_logo_storage_id: null, updated_at: Date.now() });
        }
      }
    }

    return report;
  },
});

/**
 * Files every existing meeting under its owner's company.
 *
 * Without this, a company's domain would serve nothing: a meeting with no
 * company_id is personal, and every meeting written before companies existed
 * has none. The owner's own meetings are the ones that were already on their
 * domain under the old model, so putting them on the company preserves what
 * was there rather than changing it.

 * A MEMBER'S meetings are deliberately NOT touched. Somebody added to a
 * company publishes nothing there until they choose to, which is what stops a
 * personal meeting appearing on a client's branded page.
 *
 * Same three properties as the branding backfill: dry run by default,
 * idempotent, and it only ever fills a field that is empty.
 */
export const backfillMeetings = internalMutation({
  args: { dryRun: v.optional(v.boolean()) },
  handler: async (ctx, a): Promise<Report> => {
    const dryRun = a.dryRun !== false;
    const report: Report = { dryRun, scanned: 0, actions: [], created: 0, updated: 0, skipped: [] };

    const companies = await ctx.db.query("companies").collect();

    for (const company of companies) {
      const owner = await ctx.db
        .query("profiles")
        .withIndex("by_uuid", (q) => q.eq("id", company.owner_id))
        .unique();
      if (!owner) {
        report.skipped.push(`${company.slug}: no owner`);
        continue;
      }

      const meetings = await ctx.db
        .query("meeting_types")
        .withIndex("by_user", (q) => q.eq("user_id", owner.id))
        .collect();

      for (const m of meetings) {
        report.scanned++;
        // Already filed somewhere, including under this company. Leave it.
        if (m.company_id) continue;

        report.actions.push(`${owner.username}: file "${m.name}" under ${company.slug}`);
        report.updated++;
        if (!dryRun) await ctx.db.patch(m._id, { company_id: company.id, updated_at: Date.now() });
      }
    }

    return report;
  },
});

/**
 * Files existing bookings and contacts under the company their work belongs to.
 *
 * Without this both screens go empty the moment somebody switches to their
 * company: every row written before companies existed has no company, which
 * reads as personal, while their meetings are now filed under the company.
 *
 * A BOOKING TAKES ITS MEETING'S COMPANY, because that is what it would have
 * been given had it been made today. One whose meeting has since been deleted
 * stays personal rather than being guessed at.
 *
 * A CONTACT TAKES THE COMPANY OF THE BOOKINGS IT CAME FROM, and only when
 * they agree. Somebody who has booked both a personal meeting and a company
 * one is left where they are: moving them would take them out of one list to
 * put them in another, and a contact quietly leaving a list is worse than one
 * that needs filing by hand.
 *
 * Same three properties as the others: dry run by default, idempotent, and it
 * only ever fills a field that is empty.
 */
export const backfillWork = internalMutation({
  args: { dryRun: v.optional(v.boolean()) },
  handler: async (ctx, a): Promise<Report> => {
    const dryRun = a.dryRun !== false;
    const report: Report = { dryRun, scanned: 0, actions: [], created: 0, updated: 0, skipped: [] };

    const bookings = await ctx.db.query("bookings").collect();
    const companyOfBooking = new Map<string, string | null>();

    for (const b of bookings) {
      report.scanned++;
      if (b.company_id) {
        companyOfBooking.set(b.id, b.company_id);
        continue;
      }

      const meeting = b.meeting_type_id
        ? await ctx.db.query("meeting_types").withIndex("by_uuid", (q) => q.eq("id", b.meeting_type_id as string)).unique()
        : null;
      const companyId = meeting?.company_id ?? null;
      companyOfBooking.set(b.id, companyId);
      if (!companyId) continue;

      report.updated++;
      if (!dryRun) await ctx.db.patch(b._id, { company_id: companyId, updated_at: Date.now() });
    }
    report.actions.push(`${report.updated} bookings filed from their meeting`);

    const contacts = await ctx.db.query("contacts").collect();
    let movedContacts = 0;

    for (const c of contacts) {
      report.scanned++;
      if (c.company_id) continue;

      /* Every company this address has booked with, for this host. One
         answer means the contact belongs there; several means leave them. */
      const seen = new Set<string | null>();
      for (const b of bookings) {
        if (b.host_id !== c.user_id) continue;
        if (b.guest_email.trim().toLowerCase() !== c.email.trim().toLowerCase()) continue;
        seen.add(companyOfBooking.get(b.id) ?? null);
      }

      if (seen.size !== 1) continue;
      const only = [...seen][0];
      if (!only) continue;

      movedContacts++;
      if (!dryRun) await ctx.db.patch(c._id, { company_id: only, updated_at: Date.now() });
    }
    report.updated += movedContacts;
    report.actions.push(`${movedContacts} contacts filed from their bookings`);

    return report;
  },
});
