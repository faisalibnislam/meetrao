import "server-only";

import type { ContextChoice } from "@/lib/data/context";
import { placeOf } from "@/lib/data/links";
import { addressFor } from "@/lib/workspace-links";

/**
 * Where a meeting in this workspace lives, minus its own slug.
 *
 * `prefix` is what the editor's Link field shows in front of the slug, as
 * guests see it: meetrao.com/<username>/ for a personal meeting, the
 * company's address (or its verified domain) for a company's. Built by the
 * same addressFor the list and the copy controls use, so the editor cannot
 * show one address while the list hands out another.
 *
 * `previewBase` is the path of the real page on THIS site, which for a
 * company is the company's own route rather than a custom domain the preview
 * could not open from here.
 */
export function meetingAddress(
  choice: ContextChoice | null,
  username: string,
): { prefix: string; previewBase: string } {
  const place = placeOf(choice);
  const prefix = `${addressFor(place, username, "").replace(/\/+$/, "")}/`;
  const previewBase =
    choice && choice.id && choice.slug ? `/${choice.slug}/${choice.handle ?? username}` : `/${username}`;
  return { prefix, previewBase };
}
