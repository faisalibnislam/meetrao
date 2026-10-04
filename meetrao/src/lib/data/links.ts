import "server-only";

import { ownMeetings } from "./own";
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
  const [rows, choices, context] = await Promise.all([ownMeetings(), contextChoices(), activeContext()]);
  const here = choices.find((c) => c.id === context.companyId) ?? null;
  return workspaceLinks(
    rows.filter((m) => m.is_active),
    placeOf(here),
    username,
  );
}
