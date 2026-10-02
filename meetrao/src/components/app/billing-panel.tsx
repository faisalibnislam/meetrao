"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/controls";
import { MenuSelect } from "@/components/ui/menu-select";
import { Callout, PanelHeading } from "@/components/ui/panels";
import { useToast } from "@/components/ui/toast";
import { claimDomain, openPortal, removeDomain, startCheckout, verifyDomain } from "@/lib/actions/billing";
import { saveReminderTiming } from "@/lib/actions/settings";
import { cx } from "@/lib/cx";

/* ─────────────────────────────────────────────────────────────────────────────
   Plan, domain, and the two Pro settings that live nowhere else.

   The plan shown here is whatever Polar last told us. Nothing on this screen
   can set it — the upgrade button opens a checkout and the page waits to be
   told, which is why coming back from Polar refreshes rather than assuming.
   ───────────────────────────────────────────────────────────────────────────── */

export type PlanView = { plan: "free" | "pro"; planUntil: string | null; hasSubscription: boolean };
export type DomainView = { domain: string | null; verifiedAt: string | null };
export type TimingView = { long: number; short: number };

const LONG = [
  { value: "2880", label: "2 days before" },
  { value: "1440", label: "1 day before" },
  { value: "720", label: "12 hours before" },
  { value: "240", label: "4 hours before" },
];

const SHORT = [
  { value: "120", label: "2 hours before" },
  { value: "60", label: "1 hour before" },
  { value: "30", label: "30 minutes before" },
  { value: "15", label: "15 minutes before" },
];

export function BillingPanel({
  plan,
  domain,
  timing,
  welcome,
}: {
  plan: PlanView;
  domain: DomainView;
  timing: TimingView;
  /** Set when Polar has just sent them back. */
  welcome?: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [busy, startBusy] = useTransition();
  const [draftDomain, setDraftDomain] = useState(domain.domain ?? "");
  const [records, setRecords] = useState<{ type: string; name: string; value: string }[]>([]);
  const [long, setLong] = useState(String(timing.long));
  const [short, setShort] = useState(String(timing.short));

  const pro = plan.plan === "pro";

  function go(work: () => Promise<{ error?: string; url?: string }>) {
    startBusy(async () => {
      const result = await work();
      if (result.error || !result.url) {
        toast({ tone: "bad", title: "Could not continue", text: result.error ?? "Try again in a moment." });
        return;
      }
      window.location.href = result.url;
    });
  }

  return (
    <div className="flex flex-col gap-[15px]">
      <PanelHeading title="Plan" subtitle="Meetrao is free. Pro adds the parts a business needs." />

      {welcome && !pro ? (
        <Callout tone="amber" title="Payment received — just finishing up">
          Polar confirms subscriptions in the background. Reload in a moment and Pro will be on.
        </Callout>
      ) : null}

      <div className="flex flex-col gap-[12px] rounded-[8px] border border-line bg-surface px-[15px] py-[14px]">
        <div className="flex flex-wrap items-center justify-between gap-[10px]">
          <div className="flex min-w-0 flex-col gap-[3px]">
            <span className="flex items-center gap-[8px] text-[14px] font-semibold text-ink">
              {pro ? "Pro" : "Free"}
              {pro ? <Badge tone="ok" dot={false}>Active</Badge> : null}
            </span>
            <span className="text-[12px] text-ink-3">
              {pro
                ? plan.planUntil
                  ? `Renews ${new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(new Date(plan.planUntil))}`
                  : "Active"
                : "Everything you need to take bookings, at no cost."}
            </span>
          </div>

          {pro ? (
            <Button variant="secondary" size={32} busy={busy} onClick={() => go(openPortal)}>
              Manage billing
            </Button>
          ) : (
            <div className="flex flex-wrap gap-[8px]">
              <Button variant="secondary" size={32} busy={busy} onClick={() => go(() => startCheckout("monthly"))}>
                $3 / month
              </Button>
              <Button variant="accent" size={32} busy={busy} onClick={() => go(() => startCheckout("yearly"))}>
                $10 / year
              </Button>
            </div>
          )}
        </div>

        {!pro ? (
          <ul className="m-0 flex list-none flex-col gap-[6px] p-0">
            {[
              "Your own domain for your booking page",
              "No Meetrao badge on your pages or embed",
              "Team links that rotate between people",
              "Sessions several guests share",
              "API keys and webhooks",
              "Choose when reminders go out",
            ].map((line) => (
              <li key={line} className="flex items-start gap-[8px] text-[12.5px] leading-[1.5] text-ink-2">
                <span aria-hidden="true" className="mt-[6px] h-[4px] w-[4px] flex-none rounded-full bg-accent" />
                {line}
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      {/* ── custom domain ─────────────────────────────────────────────── */}
      <div className={cx("flex flex-col gap-[11px] rounded-[8px] border px-[15px] py-[14px]", pro ? "border-line bg-surface" : "border-line bg-fill")}>
        <div className="flex flex-wrap items-center justify-between gap-[10px]">
          <span className="text-[13px] font-semibold text-ink">Your own domain</span>
          {!pro ? <Badge tone="off" dot={false}>Pro</Badge> : domain.verifiedAt ? <Badge tone="ok">Live</Badge> : null}
        </div>

        <span className="text-[12px] leading-[1.5] text-ink-3">
          Serve your booking page at book.yourcompany.com. Add the record below and we will check it.
        </span>

        {pro ? (
          <>
            <div className="flex flex-wrap items-end gap-[10px]">
              <Field label="Domain" htmlFor="custom-domain" className="min-w-[200px] flex-1">
                <Input
                  id="custom-domain"
                  height={36}
                  placeholder="book.yourcompany.com"
                  value={draftDomain}
                  onChange={(e) => setDraftDomain(e.target.value)}
                />
              </Field>
              <Button
                variant="secondary"
                size={36}
                busy={busy}
                onClick={() =>
                  startBusy(async () => {
                    const result = await claimDomain(draftDomain);
                    if (result.error) {
                      toast({ tone: "bad", title: "Could not claim", text: result.error });
                      return;
                    }
                    if (result.state?.status === "pending") setRecords(result.state.records);
                    if (result.state?.status === "unconfigured") {
                      toast({ tone: "warn", title: "Not available yet", text: "Custom domains are not configured on this deployment." });
                      return;
                    }
                    toast({ tone: "ok", title: "Domain claimed", text: "Add the DNS record, then check it." });
                    router.refresh();
                  })
                }
              >
                Claim
              </Button>
            </div>

            {records.length ? (
              <div className="flex flex-col gap-[6px] rounded-[6px] border border-line bg-fill px-[12px] py-[10px]">
                <span className="text-[12px] font-semibold text-ink">Add this record at your DNS provider</span>
                {records.map((r) => (
                  <span key={r.name} className="text-[12px] break-all text-ink-2">
                    {r.type} · {r.name} · {r.value}
                  </span>
                ))}
              </div>
            ) : null}

            {domain.domain ? (
              <div className="flex flex-wrap items-center gap-[8px]">
                <span className="min-w-0 flex-1 text-[12.5px] break-all text-ink">
                  {domain.domain}
                  {domain.verifiedAt ? "" : " — waiting for DNS"}
                </span>
                <Button
                  variant="ghost"
                  size={28}
                  busy={busy}
                  onClick={() =>
                    startBusy(async () => {
                      const result = await verifyDomain(domain.domain as string);
                      if (result.state?.status === "verified") {
                        toast({ tone: "ok", title: "Domain is live", text: "Your booking page now answers there." });
                      } else if (result.state?.status === "pending") {
                        setRecords(result.state.records);
                        toast({ tone: "warn", title: "Not visible yet", text: "DNS can take a few minutes." });
                      } else {
                        toast({ tone: "bad", title: "Could not check", text: result.error ?? "Try again shortly." });
                      }
                      router.refresh();
                    })
                  }
                >
                  Check DNS
                </Button>
                <Button
                  variant="ghost"
                  size={28}
                  busy={busy}
                  className="text-red hover:text-red"
                  onClick={() =>
                    startBusy(async () => {
                      await removeDomain();
                      setRecords([]);
                      setDraftDomain("");
                      toast({ tone: "ok", title: "Domain removed", text: "Your meetrao.com link keeps working." });
                      router.refresh();
                    })
                  }
                >
                  Remove
                </Button>
              </div>
            ) : null}
          </>
        ) : null}
      </div>

      {/* ── reminder timing ───────────────────────────────────────────── */}
      <div className="flex flex-col gap-[11px] rounded-[8px] border border-line bg-surface px-[15px] py-[14px]">
        <div className="flex flex-wrap items-center justify-between gap-[10px]">
          <span className="text-[13px] font-semibold text-ink">When reminders go out</span>
          {!pro ? <Badge tone="off" dot={false}>Pro</Badge> : null}
        </div>
        <span className="text-[12px] leading-[1.5] text-ink-3">
          Free sends one a day before and one an hour before. Pro picks its own two.
        </span>

        <div className="flex flex-wrap gap-[12px]">
          <div className="flex min-w-[170px] flex-1 flex-col gap-[6px]">
            <span className="text-[12.5px] font-semibold text-ink">First reminder</span>
            <MenuSelect aria-label="First reminder" options={LONG} value={long} onChange={setLong} disabled={!pro} />
          </div>
          <div className="flex min-w-[170px] flex-1 flex-col gap-[6px]">
            <span className="text-[12.5px] font-semibold text-ink">Second reminder</span>
            <MenuSelect aria-label="Second reminder" options={SHORT} value={short} onChange={setShort} disabled={!pro} />
          </div>
        </div>

        {pro ? (
          <div>
            <Button
              variant="accent"
              size={34}
              busy={busy}
              onClick={() =>
                startBusy(async () => {
                  const result = await saveReminderTiming({ long: Number(long), short: Number(short) });
                  if (result.error) {
                    toast({ tone: "bad", title: "Could not save", text: result.error });
                    return;
                  }
                  toast({ tone: "ok", title: "Saved", text: "New bookings follow these times." });
                  router.refresh();
                })
              }
            >
              Save timing
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
