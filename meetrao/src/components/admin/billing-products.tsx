"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/controls";
import { Callout, SectionHeading } from "@/components/ui/panels";
import { useToast } from "@/components/ui/toast";
import { createPolarProduct, createPolarProducts, savePolarProducts } from "@/lib/actions/admin";
import { PRO_MONTHLY, PRO_PRICES, PRO_YEARLY } from "@/lib/pricing";

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
  /* Which row is asking "are you sure". Replacing a product repoints the next
     checkout, so it is two clicks rather than one. */
  const [confirming, setConfirming] = useState<"monthly" | "yearly" | null>(null);

  const ready = Boolean(monthly && yearly);

  function create(cadence: "monthly" | "yearly") {
    startBusy(async () => {
      const result = await createPolarProduct(cadence);
      setConfirming(null);
      if (result.error) {
        toast({ tone: "bad", title: "Polar refused that", text: result.error });
        return;
      }
      toast({
        tone: "ok",
        title: `New ${cadence} product`,
        text: "Checkout uses it from now on. Archive the old one in Polar.",
      });
      router.refresh();
    });
  }

  return (
    <div className="mx-auto flex w-full max-w-[560px] flex-col gap-[12px] pt-[26px]">
      <SectionHeading
        title="Pro products"
        meta={ready ? undefined : "Not set up"}
        right={ready ? <Badge tone="ok">Selling</Badge> : <Badge tone="warn">Needed</Badge>}
      />

      <span className="text-[12.5px] leading-[1.55] text-ink-2">
        Pro is sold as two Polar products, {PRO_MONTHLY} and {PRO_YEARLY}. Create them here, or paste the ids
        of products you made in Polar.
      </span>

      {/* THE PRICE ON A POLAR PRODUCT CANNOT BE EDITED FROM HERE, and Create
          skips anything that already has an id. Without this, raising a price
          in the code looks like it worked (every page says the new number)
          while checkout keeps charging the old one, and the only clue is a
          Polar invoice nobody reads until a customer does. */}
      {ready ? (
        <Callout tone="amber" title="Changing a price means a new product">
          Create only fills an empty slot, and Polar will not re-price a product that has already sold. To move
          a price: make the new product in Polar, paste its id over the one below, and archive the old one
          there. Anybody already subscribed keeps the price they signed up at.
        </Callout>
      ) : null}

      {!tokenConfigured ? (
        <Callout tone="amber" title="No Polar token on this deployment">
          Set POLAR_ACCESS_TOKEN in the environment before creating products. Pasting ids still works.
        </Callout>
      ) : null}

      <div className="flex flex-col gap-[10px] rounded-[8px] border border-line bg-surface px-[15px] py-[14px]">
        <Row
          label="Monthly"
          id={monthly}
          price={`$${PRO_PRICES.monthly.amount} a month`}
          cadence="monthly"
          tokenConfigured={tokenConfigured}
          busy={busy}
          confirming={confirming === "monthly"}
          onAsk={() => setConfirming(confirming === "monthly" ? null : "monthly")}
          onCreate={() => create("monthly")}
        />
        <Row
          label="Yearly"
          id={yearly}
          price={`$${PRO_PRICES.yearly.amount} a year`}
          cadence="yearly"
          tokenConfigured={tokenConfigured}
          busy={busy}
          confirming={confirming === "yearly"}
          onAsk={() => setConfirming(confirming === "yearly" ? null : "yearly")}
          onCreate={() => create("yearly")}
          divided
        />
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

/**
 * One cadence: what it costs, which product is selling it, and a way to make a
 * new one at the price the code now names.
 *
 * The button is here rather than once at the bottom because the two cadences
 * move independently: raising the yearly price should not touch monthly, and a
 * single "create" that did both would make a duplicate of the one that had not
 * changed.
 */
function Row({
  label,
  id,
  price,
  cadence,
  tokenConfigured,
  busy,
  confirming,
  onAsk,
  onCreate,
  divided = false,
}: {
  label: string;
  id: string | null;
  price: string;
  cadence: "monthly" | "yearly";
  tokenConfigured: boolean;
  busy: boolean;
  confirming: boolean;
  onAsk: () => void;
  onCreate: () => void;
  divided?: boolean;
}) {
  return (
    <div className={divided ? "flex flex-col gap-[8px] border-t border-line-soft pt-[9px]" : "flex flex-col gap-[8px]"}>
      <div className="flex flex-wrap items-center gap-[10px]">
        <span className="min-w-[90px] text-[12.5px] text-ink-3">
          {label}
          <span className="block text-[11px] text-ink-3">{price}</span>
        </span>
        <span className="min-w-0 flex-1 text-[12.5px] break-all text-ink">{id ?? "–"}</span>

        {tokenConfigured ? (
          <Button variant="ghost" size={28} disabled={busy} onClick={onAsk}>
            {id ? "Replace" : "Create"}
          </Button>
        ) : null}
      </div>

      {confirming ? (
        <div className="flex flex-col gap-[8px] rounded-[6px] border border-amber-line bg-amber-soft px-[12px] py-[10px]">
          <span className="text-[12px] leading-[1.5] text-amber-ink">
            {id
              ? `Makes a new ${cadence} product in Polar at ${price} and points checkout at it. The one above keeps running for anybody already subscribed; archive it in Polar so nothing new reaches it.`
              : `Makes the ${cadence} product in Polar at ${price} and points checkout at it.`}
          </span>
          <div className="flex flex-wrap gap-[8px]">
            <Button variant="accent" size={30} busy={busy} onClick={onCreate}>
              {id ? `Create a new one at ${price}` : `Create it at ${price}`}
            </Button>
            <Button variant="ghost" size={30} disabled={busy} onClick={onAsk}>
              Cancel
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
