"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/controls";
import { Callout, SectionHeading } from "@/components/ui/panels";
import { useToast } from "@/components/ui/toast";
import { createPolarProducts, savePolarProducts } from "@/lib/actions/admin";

/* ─────────────────────────────────────────────────────────────────────────────
   The two products Pro is sold as.

   An operator can make them here or paste ids made in Polar's own dashboard.
   Either way they land in platform_settings rather than the environment: an
   admin creating a product cannot set an env var, and a redeploy to record two
   ids somebody just generated is a strange way to start selling a plan.

   The ACCESS TOKEN is not here and never will be. A credential is not
   configuration, and a screen that can print one is a screen that can be
   talked into printing it.
   ───────────────────────────────────────────────────────────────────────────── */

export function BillingProducts({
  monthly,
  yearly,
  tokenConfigured,
}: {
  monthly: string | null;
  yearly: string | null;
  /** Whether POLAR_ACCESS_TOKEN is set on this deployment. */
  tokenConfigured: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [busy, startBusy] = useTransition();
  const [draftMonthly, setDraftMonthly] = useState(monthly ?? "");
  const [draftYearly, setDraftYearly] = useState(yearly ?? "");

  const ready = Boolean(monthly && yearly);

  return (
    <div className="mx-auto flex w-full max-w-[560px] flex-col gap-[12px] pt-[26px]">
      <SectionHeading
        title="Pro products"
        meta={ready ? undefined : "Not set up"}
        right={ready ? <Badge tone="ok">Selling</Badge> : <Badge tone="warn">Needed</Badge>}
      />

      <span className="text-[12.5px] leading-[1.55] text-ink-2">
        Pro is sold as two Polar products — $3 a month and $10 a year. Create them here, or paste the ids of
        products you made in Polar.
      </span>

      {!tokenConfigured ? (
        <Callout tone="amber" title="No Polar token on this deployment">
          Set POLAR_ACCESS_TOKEN in the environment before creating products. Pasting ids still works.
        </Callout>
      ) : null}

      <div className="flex flex-col gap-[10px] rounded-[8px] border border-line bg-surface px-[15px] py-[14px]">
        <div className="flex flex-wrap items-center gap-[10px]">
          <span className="min-w-[90px] text-[12.5px] text-ink-3">Monthly</span>
          <span className="min-w-0 flex-1 text-[12.5px] break-all text-ink">{monthly ?? "—"}</span>
        </div>
        <div className="flex flex-wrap items-center gap-[10px] border-t border-line-soft pt-[9px]">
          <span className="min-w-[90px] text-[12.5px] text-ink-3">Yearly</span>
          <span className="min-w-0 flex-1 text-[12.5px] break-all text-ink">{yearly ?? "—"}</span>
        </div>
      </div>

      {!ready && tokenConfigured ? (
        <div>
          <Button
            variant="accent"
            size={34}
            busy={busy}
            icon="plus"
            onClick={() =>
              startBusy(async () => {
                const result = await createPolarProducts();
                if (result.error) {
                  toast({ tone: "bad", title: "Could not create", text: result.error });
                  return;
                }
                toast({ tone: "ok", title: "Products created", text: "Pro is ready to sell." });
                router.refresh();
              })
            }
          >
            Create both in Polar
          </Button>
        </div>
      ) : null}

      <details className="rounded-[8px] border border-line bg-fill px-[15px] py-[12px]">
        <summary className="cursor-pointer text-[12.5px] font-semibold text-ink">
          Paste ids from Polar instead
        </summary>
        <div className="mt-[11px] flex flex-col gap-[10px]">
          <Field label="Monthly product id" htmlFor="polar-monthly">
            <Input id="polar-monthly" height={34} value={draftMonthly} onChange={(e) => setDraftMonthly(e.target.value)} />
          </Field>
          <Field label="Yearly product id" htmlFor="polar-yearly">
            <Input id="polar-yearly" height={34} value={draftYearly} onChange={(e) => setDraftYearly(e.target.value)} />
          </Field>
          <div>
            <Button
              variant="secondary"
              size={32}
              busy={busy}
              onClick={() =>
                startBusy(async () => {
                  if (!draftMonthly.trim() || !draftYearly.trim()) {
                    toast({ tone: "bad", title: "Both are needed", text: "Pro is sold in two cadences." });
                    return;
                  }
                  const result = await savePolarProducts({ monthly: draftMonthly, yearly: draftYearly });
                  if (result.error) {
                    toast({ tone: "bad", title: "Could not save", text: result.error });
                    return;
                  }
                  toast({ tone: "ok", title: "Saved", text: "Checkout uses these from now on." });
                  router.refresh();
                })
              }
            >
              Save ids
            </Button>
          </div>
        </div>
      </details>
    </div>
  );
}
