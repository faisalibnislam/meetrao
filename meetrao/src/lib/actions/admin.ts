"use server";

import { revalidatePath } from "next/cache";
import { createProduct, type Cadence, type Tier } from "@/lib/polar";
import { env } from "@/lib/env";
import { requireAdmin } from "@/lib/data/session";
import { disconnect } from "@/lib/google/connection";
import { convexServer } from "@/lib/convex/server";
import { convexMessage } from "@/lib/convex/error";
import { api } from "@/convex/_generated/api";
import { sanitizeUsername, usernameIdeas, usernameStatus } from "@/lib/username";

export type AdminResult = { error?: string };

/**
 * Writes the audit trail through the service role.
 *
 * `admin_activity` has a SELECT policy for admins and no INSERT policy at all,
 * so every one of these written through the caller's own session was rejected
 * by RLS and thrown away unchecked. The rows that exist came from the
 * SECURITY DEFINER triggers, which bypass policies. Service-role is also the
 * right trust boundary regardless: an audit log a browser session can write to
 * is one an admin could forge entries in.
 *
 * A failure here must not fail the action it describes, which has already
 * happened, so it is reported rather than thrown.
 */
async function recordAdminActivity(entry: {
  actor_id: string;
  kind: string;
  summary: string;
}): Promise<void> {
  // Written by the mutation that caused it on the Convex side; the explicit
  // rows the admin console adds go through the same log helper.
  try {
    await (await convexServer()).mutation(api.admin.recordActivity, {
      kind: entry.kind,
      summary: entry.summary,
    });
    return;
  } catch (cause) {
    console.error("convex admin activity failed", cause);
    return;
  }

}

/* Suspension is reversible; removal is not. They are deliberately separate
   actions, and the console never offers them from the same button. */

export async function setSuspended(userId: string, suspended: boolean): Promise<AdminResult> {
  const admin = await requireAdmin();
  if (userId === admin.userId) return { error: "You cannot suspend your own account." };

  // Service role, not the admin's session: `is_suspended` is no longer
  // writable by `authenticated`, because that column plus the
  // `profiles_update_own` policy let a suspended user clear their own
  // suspension with one PostgREST call.
  try {
    await (await convexServer()).mutation(api.admin.setSuspended, { userId, suspended });
  } catch (cause) {
    return { error: convexMessage(cause, "That account could not be updated.") };
  }
  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${userId}`);
  return {};

}

/**
 * Permanent. Deletes the auth user, which cascades through every table the
 * profile owns, and holds the freed username back rather than letting it be
 * re-registered immediately.
 */
export async function removeAccount(userId: string): Promise<AdminResult> {
  const admin = await requireAdmin();
  if (userId === admin.userId) return { error: "You cannot remove your own account from here." };

  // Same reason as deleteOwnAccount: the cascade would drop the token without
  // ever telling Google, leaving Meetrao listed in the permissions of an
  // account that no longer exists here.
  await disconnect(userId);
  try {
    const convex = await convexServer();
    await convex.mutation(api.admin.removeAccountAsAdmin, { userId });
  } catch (cause) {
    return { error: convexMessage(cause, "That account could not be removed.") };
  }
  revalidatePath("/admin/users");
  return {};
}

/* ── the booking link ───────────────────────────────────────────────────────
   meetrao.com/<username> is public, unique product-wide and claimed first-come
   first-served, so it is the one part of an account an operator eventually has
   to intervene in, a squatted trademark, an impersonation, a host locked out
   of their own name. Before this the only lever was removing the account,
   which is not a proportionate answer to a bad URL.

   The atomic half lives in 0018 as two SECURITY DEFINER functions. These are
   the gate: requireAdmin(), the same syntax rules the host's own field uses,
   and the audit trail. */

/** Why a link cannot be used, or that it can. */
export type LinkCheck =
  | { state: "ok" }
  /** Another live account holds it. */
  | { state: "taken"; ideas: string[] }
  /** In `reserved_usernames`, freed by a removal or retired by an admin. */
  | { state: "retired" };

/**
 * The availability half of the admin's check, scoped to the account being
 * edited.
 *
 * Not `checkUsername` from the onboarding actions: that one passes the
 * *caller's* id to `username_available`, which is right for a host editing
 * their own link and wrong in both directions here. It would report the
 * target's existing name as taken, and it would report the admin's own name as
 * free, offering to move a host onto a link that is not available at all.
 *
 * It also separates "taken" from "retired", because the remedy differs: one
 * needs a different name, the other needs a deliberate decision to reuse a
 * name that was deliberately held back.
 */
export async function checkBookingLink(userId: string, raw: string): Promise<LinkCheck> {
  await requireAdmin();

  const value = sanitizeUsername(raw);
  // A malformed name is the browser's job to catch; it never reaches here.
  if (usernameStatus(value) !== "checking") return { state: "taken", ideas: [] };
  const convex = await convexServer();
  const state = await convex.query(api.admin.bookingLinkState, { userId, username: value });

  if (state.heldByTarget) return { state: "ok" };
  if (state.retired) return { state: "retired" };
  if (state.free) return { state: "ok" };

  // Only offer alternatives that are themselves free. An idea that is also
  // taken is worse than no idea.
  const ideas: string[] = [];
  for (const candidate of usernameIdeas(value, state.targetName)) {
    if (await convex.query(api.admin.bookingLinkAvailable, { username: candidate, forUser: userId })) {
      ideas.push(candidate);
    }
    if (ideas.length >= 3) break;
  }
  return { state: "taken", ideas };

}

/**
 * Postgres writes error messages in lowercase sentence fragments by
 * convention. These are shown to a person, so the four the functions raise on
 * purpose are spelled out here; anything else is a fault, not a refusal, and
 * is passed through rather than dressed up as one.
 */
function linkError(message: string): string {
  if (message.includes("belongs to another account")) return "That booking link belongs to another account.";
  if (message.includes("held back")) return "That booking link is held back from an earlier removal.";
  if (message.includes("not a valid booking link")) return "That is not a valid booking link.";
  if (message.includes("no such account")) return "That account no longer exists.";
  return message;
}

export async function setBookingLink(input: {
  userId: string;
  username: string;
  /** Hold the old name back so nobody (the host included) can re-register it. */
  retireOld: boolean;
  /** Reuse a name that is currently held back. Asked for explicitly, never implied. */
  force?: boolean;
}): Promise<AdminResult> {
  const admin = await requireAdmin();

  const username = sanitizeUsername(input.username);
  // The same validator the host's own field uses, so the two surfaces can
  // never disagree about what is allowed, including the reserved-word list,
  // which the database does not know about.
  if (usernameStatus(username) !== "checking") return { error: "That is not a valid booking link." };

  let data: { old_username: string; new_username: string } | null;
  try {
    data = await (await convexServer()).mutation(api.admin.setBookingLink, {
      userId: input.userId,
      username,
      retireOld: input.retireOld,
      force: input.force ?? false,
    });
  } catch (cause) {
    return { error: linkError(convexMessage(cause, "That link could not be set.")) };
  }

  if (!data) return { error: "That account no longer exists." };
  if (data.old_username === data.new_username) return {};

  await recordAdminActivity({
    actor_id: admin.userId,
    kind: "user_link_changed",
    summary: `${admin.profile.full_name || admin.profile.username} changed a booking link from /${
      data.old_username
    } to /${data.new_username}${input.retireOld ? " and held the old one back" : ""}`,
  });

  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${input.userId}`);
  return {};
}

/**
 * Takes the current link out of circulation and parks the host on a neutral
 * placeholder.
 *
 * `profiles.username` is NOT NULL, so there is no state in which an account
 * has no booking link, removing one necessarily means replacing it. The old
 * name is always held back, or the host could claim it straight back from
 * Settings → Profile and the intervention would have achieved nothing.
 *
 * This does not take the booking page down. That switch is suspension, and
 * merging the two would make every rename a silent deactivation.
 */
export async function releaseBookingLink(userId: string): Promise<AdminResult & { username?: string }> {
  const admin = await requireAdmin();

  let data: { old_username: string; new_username: string } | null;
  try {
    data = await (await convexServer()).mutation(api.admin.releaseBookingLink, { userId });
  } catch (cause) {
    return { error: linkError(convexMessage(cause, "That link could not be retired.")) };
  }

  if (!data) return { error: "That account no longer exists." };

  await recordAdminActivity({
    actor_id: admin.userId,
    kind: "user_link_released",
    summary: `${admin.profile.full_name || admin.profile.username} retired the booking link /${
      data.old_username
    } and moved the account to /${data.new_username}`,
  });

  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${userId}`);
  return { username: data.new_username };
}

/* ── Held-back booking links ────────────────────────────────────────────────
   A name goes into `reserved_usernames` when an account is removed or an admin
   retires a link, so a dead `meetrao.com/<link>` cannot be handed to the next
   person who signs up, old meeting invitations still point at it.

   That hold is permanent until someone lifts it, and until now nothing could:
   the Convex functions existed and no screen reached them, so a reserved name
   was gone for good. These two are that screen. */

export type ReclaimableLink = {
  username: string;
  reason: string;
  reserved_at: string;
  /** Non-null means a profile still serves this link; it must not be freed. */
  heldBy: { id: string; name: string } | null;
};

export async function listHeldBookingLinks(): Promise<ReclaimableLink[]> {
  await requireAdmin();
  try {
    return (await (await convexServer()).query(api.admin.listReservedUsernames, {})) as ReclaimableLink[];
  } catch (cause) {
    console.error("held booking links could not be read", cause);
    return [];
  }
}

/**
 * Frees a held-back link so it can be claimed again.
 *
 * REFUSES A NAME SOMETHING STILL HOLDS. A reservation should only exist for a
 * name nobody occupies, but they are separate rows and nothing enforces it,
 * and freeing an occupied name would let a second account claim a link the
 * first is still serving, which is the one outcome the hold exists to prevent.
 * Checked here against live data rather than trusting what the page rendered,
 * because the list the admin clicked may be minutes old.
 *
 * The audit row is written inside the Convex mutation, so this does not add a
 * second one.
 */
export async function reclaimBookingLink(username: string): Promise<AdminResult> {
  await requireAdmin();
  const key = sanitizeUsername(username);
  if (!key) return { error: "That is not a booking link." };

  const convex = await convexServer();

  let held: ReclaimableLink[];
  try {
    held = (await convex.query(api.admin.listReservedUsernames, {})) as ReclaimableLink[];
  } catch (cause) {
    return { error: convexMessage(cause, "That link could not be reclaimed.") };
  }

  const row = held.find((r) => r.username === key);
  if (!row) return { error: `/${key} is not being held back.` };
  if (row.heldBy) {
    return { error: `/${key} is in use by ${row.heldBy.name}. Retire their link first.` };
  }

  try {
    const freed = await convex.mutation(api.admin.unreserveUsername, { username: key });
    if (!freed) return { error: `/${key} is not being held back.` };
  } catch (cause) {
    return { error: convexMessage(cause, "That link could not be reclaimed.") };
  }

  revalidatePath("/admin/settings");
  revalidatePath("/admin/users");
  return {};
}

export async function savePlatformSettings(input: {
  appName: string;
  supportEmail: string;
}): Promise<AdminResult> {
  await requireAdmin();

  if (!input.appName.trim()) return { error: "The app needs a name." };
  if (!input.supportEmail.includes("@")) return { error: "Enter a support address people can reach." };
  try {
    await (await convexServer()).mutation(api.platformSettings.update, {
      app_name: input.appName.trim(),
      support_email: input.supportEmail.trim(),
    });
  } catch (cause) {
    return { error: convexMessage(cause, "Those settings could not be saved.") };
  }
  revalidatePath("/admin/settings");
  return {};

}

export async function saveAdminAccount(input: { fullName: string }): Promise<AdminResult> {
  const admin = await requireAdmin();
  try {
    await (await convexServer()).mutation(api.profiles.updateOwn, { full_name: input.fullName.trim() });
  } catch (cause) {
    return { error: convexMessage(cause, "That name could not be saved.") };
  }
  revalidatePath("/admin/settings");
  return {};

}

/* ── billing products ──────────────────────────────────────────────────────── */

export type ProductResult = {
  error?: string;
  monthly?: string | null;
  yearly?: string | null;
  businessMonthly?: string | null;
  businessYearly?: string | null;
};

/**
 * Which settings field holds each product id.
 *
 * One map rather than a conditional at every call site: four slots across two
 * tiers is exactly the shape where a stray ternary records a Business id in
 * the Pro field, and the webhook then grants Pro to somebody paying for
 * Business.
 */
const SLOT: Record<Tier, Record<Cadence, keyof ProductIds>> = {
  pro: { monthly: "polar_product_monthly", yearly: "polar_product_yearly" },
  business: { monthly: "polar_product_business_monthly", yearly: "polar_product_business_yearly" },
};

type ProductIds = {
  polar_product_monthly: string;
  polar_product_yearly: string;
  polar_product_business_monthly: string;
  polar_product_business_yearly: string;
};

/** The settings query's shape, keyed the way the slots are. */
const READ: Record<Tier, Record<Cadence, "monthly" | "yearly" | "businessMonthly" | "businessYearly">> = {
  pro: { monthly: "monthly", yearly: "yearly" },
  business: { monthly: "businessMonthly", yearly: "businessYearly" },
};

/**
 * Creates ONE Pro product at the price the code currently names, and points
 * the plan at it.
 *
 * Separate from createPolarProducts, which deliberately leaves a filled slot
 * alone so an operator cannot make two live products at the same price by
 * pressing a button twice. That rule is right for setting the plan up and
 * wrong for changing a price, which is the only way to change one: Polar will
 * not re-price a product that has already sold.
 *
 * So this one REPLACES. The old product keeps running in Polar for anybody
 * already subscribed to it, and should be archived there so nothing new
 * reaches it. Admin-only, and the screen asks before calling it, because the
 * next checkout goes to whatever this returns.
 */
export async function createPolarProduct(
  cadence: Cadence,
  tier: Tier = "pro",
): Promise<ProductResult & { created?: string }> {
  await requireAdmin();

  if (!env().POLAR_ACCESS_TOKEN) return { error: "No Polar access token is set on this deployment." };

  let id: string;
  try {
    id = (await createProduct(tier, cadence)).id;
  } catch (cause) {
    return { error: cause instanceof Error ? cause.message : "Polar refused the product." };
  }

  const convex = await convexServer();
  await convex.mutation(api.platformSettings.update, { [SLOT[tier][cadence]]: id });

  revalidatePath("/admin/settings");
  const after = await convex.query(api.platformSettings.products, {});
  return { created: id, ...after };
}

/**
 * Creates every product that does not have one yet, across both tiers, and
 * records their ids.
 *
 * Admin-only, and idempotent in the way that matters: a slot that already has
 * an id is left alone rather than creating a second product at the same
 * price. Two live products for one plan is how a customer ends up subscribed
 * to the one nobody is watching.
 */
export async function createPolarProducts(): Promise<ProductResult> {
  await requireAdmin();

  if (!env().POLAR_ACCESS_TOKEN) return { error: "No Polar access token is set on this deployment." };

  const convex = await convexServer();
  const existing = await convex.query(api.platformSettings.products, {});

  const patch: Partial<ProductIds> = {};
  try {
    for (const tier of ["pro", "business"] as const) {
      for (const cadence of ["monthly", "yearly"] as const) {
        if (existing[READ[tier][cadence]]) continue;
        patch[SLOT[tier][cadence]] = (await createProduct(tier, cadence)).id;
      }
    }
  } catch (cause) {
    return { error: cause instanceof Error ? cause.message : "Polar refused the product." };
  }

  if (Object.keys(patch).length > 0) {
    await convex.mutation(api.platformSettings.update, patch);
  }

  revalidatePath("/admin/settings");
  return { ...existing, ...(await convex.query(api.platformSettings.products, {})) };
}

/**
 * Records ids for products made in Polar's own dashboard.
 *
 * A blank field clears nothing: it is left as it was. An operator filling in
 * the two Pro boxes should not wipe the Business ids by not typing in them.
 */
export async function savePolarProducts(input: {
  monthly?: string;
  yearly?: string;
  businessMonthly?: string;
  businessYearly?: string;
}): Promise<ProductResult> {
  await requireAdmin();
  const convex = await convexServer();

  const patch: Partial<ProductIds> = {};
  if (input.monthly?.trim()) patch.polar_product_monthly = input.monthly.trim();
  if (input.yearly?.trim()) patch.polar_product_yearly = input.yearly.trim();
  if (input.businessMonthly?.trim()) patch.polar_product_business_monthly = input.businessMonthly.trim();
  if (input.businessYearly?.trim()) patch.polar_product_business_yearly = input.businessYearly.trim();

  if (Object.keys(patch).length > 0) await convex.mutation(api.platformSettings.update, patch);

  revalidatePath("/admin/settings");
  return await convex.query(api.platformSettings.products, {});
}

/* ── complimentary Pro ─────────────────────────────────────────────────────── */

export type GrantResult = { error?: string };

/**
 * Gives an account Pro without a payment.
 *
 * The length and the reason are both checked in Convex as well. This is the
 * form's side of a rule whose boundary is the mutation, like every other
 * admin action here.
 */
export async function grantProToUser(input: {
  userId: string;
  length: string;
  reason: string;
  /** Absent is Pro, which is what every grant meant before Business existed. */
  plan?: "pro" | "business";
}): Promise<GrantResult> {
  await requireAdmin();
  if (!input.reason.trim()) return { error: "Say why this account is getting a plan." };

  const convex = await convexServer();
  try {
    await convex.mutation(api.admin.grantPro, {
      userId: input.userId,
      length: input.length,
      reason: input.reason.trim(),
      plan: input.plan ?? "pro",
    });
  } catch (cause) {
    return { error: convexMessage(cause, "That grant could not be saved.") };
  }

  revalidatePath(`/admin/users/${input.userId}`);
  revalidatePath("/admin/users");
  return {};
}

export async function revokeProFromUser(userId: string): Promise<GrantResult> {
  await requireAdmin();
  const convex = await convexServer();
  try {
    await convex.mutation(api.admin.revokePro, { userId });
  } catch (cause) {
    return { error: convexMessage(cause, "That grant could not be removed.") };
  }

  revalidatePath(`/admin/users/${userId}`);
  revalidatePath("/admin/users");
  return {};
}
