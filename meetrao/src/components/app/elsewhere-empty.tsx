"use client";

import { useRouter } from "next/navigation";
import { useTransition, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/panels";
import { useToast } from "@/components/ui/toast";
import { setContext } from "@/lib/actions/context";
/* From the client-safe module, not src/lib/data/elsewhere.ts: that one is
   server-only and reaching it from here is a build error. */
import { describeElsewhere, type Elsewhere } from "@/lib/elsewhere";

/* ─────────────────────────────────────────────────────────────────────────────
   The empty state for a screen that is empty only because of where you are.

   "No meetings yet" next to a Create button is a confident claim that you
   have none, and for somebody whose work all sits in their company it is
   false in the most alarming way available: it looks exactly like their
   meetings have been deleted.

   SO THE SWITCH IS THE PRIMARY ACTION. Creating another one is not what
   somebody in this position wants, and offering it first invites them to make
   a duplicate of something they already have.
   ───────────────────────────────────────────────────────────────────────── */

export function ElsewhereEmptyState({
  here,
  what,
  found,
  action,
}: {
  /** The workspace in force, named so the title is about a place. */
  here: string;
  /** The singular noun: "meeting", "contact". */
  what: string;
  /** Where the rows actually are. Empty means nothing anywhere, and then this
      component should not be rendered at all. */
  found: Elsewhere[];
  /** The screen's usual create control, kept but demoted. */
  action?: ReactNode;
}) {
  const router = useRouter();
  const toast = useToast();
  const [busy, startSwitch] = useTransition();
  const go = found[0];

  return (
    <EmptyState
      title={`No ${what}s in ${here}`}
      text={describeElsewhere(found, what)}
      action={
        <div className="flex flex-wrap items-center gap-[8px]">
          <Button
            variant="accent"
            size={30}
            icon="rotate-left"
            busy={busy}
            onClick={() =>
              startSwitch(async () => {
                const result = await setContext(go.id);
                if (result.error) {
                  toast({ tone: "bad", title: "Could not switch", text: result.error });
                  return;
                }
                router.refresh();
              })
            }
          >
            {`Switch to ${go.name}`}
          </Button>
          {action}
        </div>
      }
    />
  );
}
