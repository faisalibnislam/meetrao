import "server-only";

import { convexServer } from "@/lib/convex/server";
import { api } from "@/convex/_generated/api";
import type { AssignableMeeting, TeamView } from "@/components/app/team-panel";
import type { HookView, KeyView } from "@/components/app/developer-panel";
import type { DomainView, PlanView, TimingView } from "@/components/app/billing-panel";

/* What the Team settings panel needs, in one place: the teams this host owns
   or belongs to, and their own meetings, any of which can be handed to a
   team they own. */

/** Whether the signed-in host is on Pro. For screens that only need the flag. */
export async function isProNow(): Promise<boolean> {
  const convex = await convexServer();
  return (await convex.query(api.billing.mine, {})).plan === "pro";
}

export async function billingPanelData(): Promise<{
  plan: PlanView;
  domain: DomainView;
  timing: TimingView;
}> {
  const convex = await convexServer();
  const [plan, domain, profile] = await Promise.all([
    convex.query(api.billing.mine, {}),
    convex.query(api.domains.mine, {}),
    convex.query(api.profiles.current, {}),
  ]);

  return {
    plan: {
      plan: plan.plan,
      planUntil: plan.plan_until,
      hasSubscription: plan.has_subscription,
      complimentary: plan.complimentary,
      compUntil: plan.comp_until,
    },
    domain: { domain: domain.domain, verifiedAt: domain.verified_at },
    timing: {
      // Absent is the free schedule, which is also where Pro starts.
      long: profile?.reminder_long_minutes ?? 1440,
      short: profile?.reminder_short_minutes ?? 60,
    },
  };
}

/**
 * The Branding panel: logo, colour and the domain.
 *
 * The domain is read here as well as in billingPanelData. It is one row and
 * two screens used to show it. The Plan screen now only links across, but the
 * query is cheap and keeping both shapes means neither screen has to know
 * about the other.
 */
export async function brandingPanelData(): Promise<{
  pro: boolean;
  logoUrl: string | null;
  color: string | null;
  background: string | null;
  domain: DomainView;
}> {
  const convex = await convexServer();
  const [brand, domain] = await Promise.all([
    convex.query(api.branding.mine, {}),
    convex.query(api.domains.mine, {}),
  ]);

  return {
    pro: brand.live,
    logoUrl: brand.logo_url,
    color: brand.color,
    background: brand.background,
    domain: { domain: domain.domain, verifiedAt: domain.verified_at },
  };
}

export async function developerPanelData(): Promise<{
  keys: KeyView[];
  hooks: HookView[];
  pro: boolean;
}> {
  const convex = await convexServer();
  const [keys, hooks, plan] = await Promise.all([
    convex.query(api.apiKeys.list, {}),
    convex.query(api.webhooks.list, {}),
    convex.query(api.billing.mine, {}),
  ]);

  return {
    keys: keys.map((k) => ({
      id: k.id,
      name: k.name,
      prefix: k.prefix,
      createdAt: k.created_at,
      lastUsedAt: k.last_used_at,
    })),
    hooks: hooks.map((h) => ({
      id: h.id,
      url: h.url,
      secret: h.secret,
      lastStatus: h.last_status,
      lastError: h.last_error,
      lastAttemptAt: h.last_attempt_at,
    })),
    pro: plan.plan === "pro",
  };
}

export async function teamPanelData(userId: string): Promise<{
  teams: TeamView[];
  meetings: AssignableMeeting[];
  pro: boolean;
}> {
  const convex = await convexServer();
  const [rows, meetings, plan] = await Promise.all([
    convex.query(api.teams.mine, {}),
    convex.query(api.meetingTypes.listOwn, {}),
    convex.query(api.billing.mine, {}),
  ]);
  void userId;

  return {
    teams: rows.map((t) => ({
      id: t.id,
      name: t.name,
      slug: t.slug,
      isOwner: t.is_owner,
      members: t.members.map((m) => ({
        userId: m.user_id,
        name: m.name,
        email: m.email,
        role: m.role,
        timezone: m.timezone,
      })),
      meetings: t.meetings.map((m) => ({ id: m.id, name: m.name, slug: m.slug })),
    })),
    meetings: meetings.map((m) => ({ id: m.id, name: m.name, teamId: m.team_id ?? null })),
    pro: plan.plan === "pro",
  };
}
