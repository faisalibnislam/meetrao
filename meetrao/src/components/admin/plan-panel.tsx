"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/controls";
import { MenuSelect } from "@/components/ui/menu-select";
import { Modal } from "@/components/ui/modal";
import { SectionHeading } from "@/components/ui/panels";
import { useToast } from "@/components/ui/toast";
import { grantProToUser, revokeProFromUser } from "@/lib/actions/admin";

/* ─────────────────────────────────────────────────────────────────────────────
   One account's plan, and giving Pro away.

   A grant is shown as what it is — "Pro, on the house" — never as a
   subscription. An operator looking at this screen in six months needs to be
   able to tell a paying customer from a favour, and so does anybody counting
   revenue.
   ───────────────────────────────────────────────────────────────────────────── */

export type PlanInfo = {
  plan: "free" | "pro";
  subscribed: boolean;
  comp: boolean;
  compUntil: string | null;
  compReason: string;
  compGrantedBy: string | null;
  planUntil: string | null;
};

const LENGTHS = [
  { value: "month", label: "One month" },
  { value: "quarter", label: "Three months" },
  { value: "year", label: "One year" },
  { value: "forever", label: "Indefinitely" },
];

function when(iso: string | null): string {
  if (!iso) return "—";
  const date = new Date(iso);
  // A hundred years out is the "forever" grant; printing the date would be
  // technically true and useless.
  if (date.getFullYear() > new Date().getFullYear() + 50) return "no end date";
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(date);
}

export function PlanPanel({ userId, name, info }: { userId: string; name: string; info: PlanInfo }) {
  const router = useRouter();
  const toast = useToast();
  const [busy, startBusy] = useTransition();
  const [dialog, setDialog] = useState<"grant" | "revoke" | null>(null);
  const [length, setLength] = useState("year");
  const [reason, setReason] = useState("");

  return (
    <section className="flex flex-col gap-[11px]">
      <SectionHeading
        title="Plan"
        right={
          info.plan === "pro" ? (
            <Badge tone="ok">{info.subscribed ? "Pro · paying" : "Pro · granted"}</Badge>
          ) : (
            <Badge tone="off">Free</Badge>
          )
        }
      />

      <div className="flex flex-col gap-[9px] rounded-[8px] border border-line bg-surface px-[15px] py-[14px]">
        <div className="flex flex-wrap items-center gap-[10px]">
          <span className="min-w-[110px] text-[12.5px] text-ink-3">Subscription</span>
          <span className="min-w-0 flex-1 text-[13px] text-ink">
            {info.subscribed ? `Paying, renews ${when(info.planUntil)}` : "None"}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-[10px] border-t border-line-soft pt-[9px]">
          <span className="min-w-[110px] text-[12.5px] text-ink-3">Granted Pro</span>
          <span className="min-w-0 flex-1 text-[13px] text-ink">
            {info.comp ? `Until ${when(info.compUntil)}` : "None"}
          </span>
        </div>

        {info.comp ? (
          <div className="flex flex-col gap-[3px] border-t border-line-soft pt-[9px]">
            <span className="text-[12px] text-ink-3">
              {info.compReason || "No reason recorded"}
              {info.compGrantedBy ? ` · by ${info.compGrantedBy}` : ""}
            </span>
          </div>
        ) : null}

        <div className="flex flex-wrap gap-[8px] border-t border-line-soft pt-[11px]">
          <Button
            variant="secondary"
            size={30}
            icon="plus"
            onClick={() => {
              setReason("");
              setDialog("grant");
            }}
          >
            {info.comp ? "Change grant" : "Give Pro"}
          </Button>
          {info.comp ? (
            <Button
              variant="ghost"
              size={30}
              className="text-red hover:text-red"
              onClick={() => setDialog("revoke")}
            >
              Take it back
            </Button>
          ) : null}
        </div>

        {info.subscribed && info.comp ? (
          /* Both at once is legitimate — somebody granted Pro who later
             subscribed — but it is worth saying out loud, because revoking the
             grant will not take Pro away. */
          <span className="text-[12px] leading-[1.5] text-amber">
            This account both pays and holds a grant. Removing the grant leaves them Pro through their
            subscription.
          </span>
        ) : null}
      </div>

      <Modal
        open={dialog === "grant"}
        onClose={() => setDialog(null)}
        title={`Give ${name} Pro`}
        subtitle="They get everything Pro does, at no charge. No card, no invoice, no subscription."
        primary={{
          label: busy ? "Saving…" : "Give Pro",
          busy,
          onClick: () =>
            startBusy(async () => {
              const result = await grantProToUser({ userId, length, reason });
              if (result.error) {
                toast({ tone: "bad", title: "Could not grant", text: result.error });
                return;
              }
              setDialog(null);
              toast({ tone: "ok", title: "Pro granted", text: `${name} has Pro.` });
              router.refresh();
            }),
        }}
        secondary={{ label: "Cancel", onClick: () => setDialog(null) }}
      >
        <div className="flex flex-col gap-[12px]">
          <div className="flex flex-col gap-[6px]">
            <span className="text-[12.5px] font-semibold text-ink">For how long</span>
            <MenuSelect aria-label="How long" options={LENGTHS} value={length} onChange={setLength} />
          </div>
          <Field
            label="Why"
            htmlFor="comp-reason"
            help="Recorded against the account and in the activity log. Only operators see it."
          >
            <Input
              id="comp-reason"
              height={36}
              maxLength={140}
              placeholder="Early user, reported the booking bug"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </Field>
        </div>
      </Modal>

      <Modal
        open={dialog === "revoke"}
        onClose={() => setDialog(null)}
        title="Take back granted Pro?"
        primary={{
          label: "Take it back",
          variant: "danger",
          busy,
          onClick: () =>
            startBusy(async () => {
              const result = await revokeProFromUser(userId);
              if (result.error) {
                toast({ tone: "bad", title: "Could not revoke", text: result.error });
                return;
              }
              setDialog(null);
              toast({ tone: "ok", title: "Grant removed", text: `${name} is back on Free.` });
              router.refresh();
            }),
        }}
        secondary={{ label: "Keep it", onClick: () => setDialog(null) }}
      >
        <span className="text-[13.5px] leading-[1.55] text-pretty text-ink-2">
          {name} loses the Pro features immediately — a custom domain stops resolving, team links stop
          answering, and API keys stop working. Nothing they have made is deleted.
        </span>
      </Modal>
    </section>
  );
}
