import "server-only";

import { convexServer } from "@/lib/convex/server";
import { api } from "@/convex/_generated/api";
import type { AssignableMeeting, TeamView } from "@/components/app/team-panel";
import type { HookView, KeyView } from "@/components/app/developer-panel";

/* What the Team settings panel needs, in one place: the teams this host owns
   or belongs to, and their own meetings — any of which can be handed to a
   team they own. */

export async function developerPanelData(): Promise<{
  keys: KeyView[];
  hooks: HookView[];
}> {
  const convex = await convexServer();
  const [keys, hooks] = await Promise.all([
    convex.query(api.apiKeys.list, {}),
    convex.query(api.webhooks.list, {}),
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
  };
}

export async function teamPanelData(userId: string): Promise<{
  teams: TeamView[];
  meetings: AssignableMeeting[];
}> {
  const convex = await convexServer();
  const [rows, meetings] = await Promise.all([
    convex.query(api.teams.mine, {}),
    convex.query(api.meetingTypes.listOwn, {}),
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
  };
}
