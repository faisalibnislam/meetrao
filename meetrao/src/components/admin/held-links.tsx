"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Callout, PanelHeading } from "@/components/ui/panels";
import { useToast } from "@/components/ui/toast";
import { reclaimBookingLink, type ReclaimableLink } from "@/lib/actions/admin";

/* ─────────────────────────────────────────────────────────────────────────────
   Booking links nobody holds any more.

   A name is held back when an account is removed or an admin retires a link,
   so that a dead `meetrao.com/<link>` cannot be handed to the next person who
   signs up, old meeting invitations still point at it, and a stranger
   inheriting them is worse than a 404.

   That hold was permanent: the Convex functions to list and lift it existed
   and no screen ever reached them. So this is the release valve, with the
   reason and the date visible, because "why is this name taken?" is the
   question an admin actually arrives with.
   ───────────────────────────────────────────────────────────────────────────── */

function when(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

export function HeldLinks({ links, siteHost }: { links: ReclaimableLink[]; siteHost: string }) {
  const toast = useToast();
  const router = useRouter();
  const [pending, startAction] = useTransition();
  /** Which row is mid-flight, so only its own button shows a spinner. */
  const [working, setWorking] = useState<string | null>(null);

  return (
    <section className="flex flex-col gap-[14px] border-t border-line pt-[20px]">
      <PanelHeading
        title="Held booking links"
        subtitle="Names kept out of circulation after an account was removed or a link retired. Reclaiming one lets somebody sign up with it again."
      />

      {links.length === 0 ? (
        <span className="text-[13px] leading-[1.55] text-ink-3">
          No links are being held back. Removing an account adds its link here.
        </span>
      ) : (
        <ul className="m-0 flex list-none flex-col gap-[8px] p-0">
          {links.map((link) => (
            <li
              key={link.username}
              className="flex flex-wrap items-center gap-[10px] rounded-[8px] border border-line bg-fill px-[13px] py-[11px]"
            >
              <div className="flex min-w-0 flex-1 flex-col gap-[2px]">
                <span className="truncate font-medium text-[13.5px] text-ink">
                  {siteHost}/{link.username}
                </span>
                <span className="text-[12px] leading-[1.5] text-ink-3">
                  {link.reason} · {when(link.reserved_at)}
                </span>
              </div>

              {link.heldBy ? (
                /* A reservation is only meant to exist for a name nobody holds.
                   When both rows exist anyway, say so rather than offering a
                   button that would hand a live link to a second account. */
                <span className="text-[12px] text-ink-3">In use by {link.heldBy.name}</span>
              ) : (
                <Button
                  variant="secondary"
                  size={30}
                  busy={pending && working === link.username}
                  disabled={pending}
                  onClick={() =>
                    startAction(async () => {
                      setWorking(link.username);
                      const r = await reclaimBookingLink(link.username);
                      setWorking(null);
                      toast(
                        r.error
                          ? { tone: "bad", title: "Could not reclaim", text: r.error }
                          : {
                              tone: "ok",
                              title: "Link reclaimed",
                              text: `/${link.username} can be signed up with again.`,
                            },
                      );
                      router.refresh();
                    })
                  }
                >
                  Reclaim
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}

      {links.some((l) => l.heldBy) ? (
        <Callout tone="amber" title="Some held names are still in use">
          A held name should have no account on it. Where one does, retire that account&rsquo;s link from its
          user page before reclaiming the name.
        </Callout>
      ) : null}
    </section>
  );
}
