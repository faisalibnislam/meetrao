"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/data/session";
import { convexServer } from "@/lib/convex/server";
import { convexMessage } from "@/lib/convex/error";
import { api } from "@/convex/_generated/api";
import { activeContext } from "@/lib/data/context";

/* Teams: a booking link several hosts answer in turn. The invariants (one
   owner, members must already have accounts, a product-wide unique link) are
   enforced in convex/teams.ts, which is the boundary; these actions are the
   form's side of the same rules. */

export type TeamResult = { error?: string; id?: string; slug?: string };

async function viaConvex<T>(
  work: (c: Awaited<ReturnType<typeof convexServer>>) => Promise<T>,
): Promise<{ value?: T; error?: string }> {
  try {
    return { value: await work(await convexServer()) };
  } catch (e) {
    return { error: convexMessage(e) };
  }
}

export async function createTeam(input: { name: string; slug: string }): Promise<TeamResult> {
  await requireSession();
  if (!input.name.trim()) return { error: "Give the team a name." };

  /* Made in the workspace the person is looking at, so an agency's client
     rota stays in that client's settings. */
  const { companyId } = await activeContext();
  const { value, error } = await viaConvex((c) =>
    c.mutation(api.teams.create, { ...input, company_id: companyId }),
  );
  if (error) return { error };
  revalidatePath("/settings/team");
  return { id: value?.id, slug: value?.slug };
}

export async function renameTeam(input: { id: string; name: string; slug: string }): Promise<TeamResult> {
  await requireSession();
  const { error } = await viaConvex((c) => c.mutation(api.teams.rename, input));
  if (error) return { error };
  revalidatePath("/settings/team");
  return {};
}

export async function addTeamMember(input: { id: string; email: string }): Promise<TeamResult> {
  await requireSession();
  if (!input.email.includes("@")) return { error: "That is not an email address." };

  const { error } = await viaConvex((c) => c.mutation(api.teams.addMember, input));
  if (error) return { error };
  revalidatePath("/settings/team");
  return {};
}

export async function removeTeamMember(input: { id: string; userId: string }): Promise<TeamResult> {
  await requireSession();
  const { error } = await viaConvex((c) => c.mutation(api.teams.removeMember, input));
  if (error) return { error };
  revalidatePath("/settings/team");
  return {};
}

export async function deleteTeam(id: string): Promise<TeamResult> {
  await requireSession();
  const { error } = await viaConvex((c) => c.mutation(api.teams.remove, { id }));
  if (error) return { error };
  revalidatePath("/settings/team");
  revalidatePath("/meetings");
  return {};
}

/** Points a meeting at a team, or back at the host who owns it. */
export async function setMeetingTeam(input: { meetingId: string; teamId: string | null }): Promise<TeamResult> {
  await requireSession();
  const { error } = await viaConvex((c) =>
    c.mutation(api.meetingTypes.update, { id: input.meetingId, team_id: input.teamId }),
  );
  if (error) return { error };
  revalidatePath("/settings/team");
  revalidatePath("/meetings");
  return {};
}
