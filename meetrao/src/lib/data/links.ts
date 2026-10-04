import "server-only";

import { convexServer } from "@/lib/convex/server";
import { api } from "@/convex/_generated/api";
import { activeContext, contextChoices, type ContextChoice } from "./context";
import { workspaceLinks, type ShareableLink, type WorkspaceLinkPlace } from "@/lib/workspace-links";

/** A workspace choice, in the shape the link builder takes. */
export function placeOf(choice: ContextChoice | null | undefined): WorkspaceLinkPlace {
  return {
    companyId: choice?.id ?? null,
    slug: choice?.slug ?? null,
    domain: choice?.domain ?? null,
    domainVerified: choice?.domainVerified ?? false,
    handle: choice?.handle ?? null,
  };
}

/** The active links of the workspace in force, ready to copy or share. */
export async function shareableLinks(username: string): Promise<ShareableLink[]> {
  const convex = await convexServer();
  const [rows, choices, context] = await Promise.all([
    convex.query(api.meetingTypes.listOwn, { activeOnly: true }),
    contextChoices(),
    activeContext(),
  ]);
  const here = choices.find((c) => c.id === context.companyId) ?? null;
  return workspaceLinks(
    rows as unknown as { id: string; name: string; slug: string; company_id?: string | null }[],
    placeOf(here),
    username,
  );
}
