"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Help, Input, Label } from "@/components/ui/controls";
import { Callout, PanelHeading } from "@/components/ui/panels";
import { useToast } from "@/components/ui/toast";
import { logoUploadUrl, removeLogo, saveLogo, setBrandColor } from "@/lib/actions/branding";
import { claimDomain, removeDomain, verifyDomain } from "@/lib/actions/billing";
import { brandTokens, normaliseHex, validateBrandColor } from "@/convex/lib/brand";
import { Logo } from "@/components/ui/logo";
import type { DomainView } from "./billing-panel";

/* ─────────────────────────────────────────────────────────────────────────────
   Make the booking page theirs: logo, colour, and their own domain.

   All three are Pro, and all three are shown to a free host rather than
   hidden — a feature nobody can see is a feature nobody buys. What a free host
   sees is the real panel with its controls disabled and a Pro badge on it, not
   a different screen.

   THE PREVIEW IS THE POINT OF THIS SCREEN. A hex field alone makes a host
   guess, save, open their booking page in another tab, and come back. The
   preview below is built from the same brandTokens() the booking page uses, so
   what it shows is what a guest gets — including the derived label colour,
   which is the part nobody predicts.
   ───────────────────────────────────────────────────────────────────────────── */

const MAX_BYTES = 1_000_000;
const ACCEPT = "image/png,image/jpeg,image/webp";

/* Dark, mid and light, and deliberately not a rainbow: these are here to show
   that any hue works and to give a host a starting point, not to be a palette
   they are meant to pick from. */
const SUGGESTED = ["#14554a", "#1f3d7a", "#7a2048", "#8a4b1f", "#2f6d3a", "#1a1917"];

export function BrandingPanel({
  pro,
  logoUrl,
  color,
  domain,
  username,
  siteHost,
}: {
  pro: boolean;
  logoUrl: string | null;
  color: string | null;
  domain: DomainView;
  username: string;
  /** "meetrao.com" — for showing what the link looks like either way. */
  siteHost: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const input = useRef<HTMLInputElement>(null);
  const [busy, startBusy] = useTransition();

  const [logo, setLogo] = useState(logoUrl);
  const [draftColor, setDraftColor] = useState(color ?? "");
  const [savedColor, setSavedColor] = useState(color);

  const [draftDomain, setDraftDomain] = useState(domain.domain ?? "");
  const [records, setRecords] = useState<{ type: string; name: string; value: string }[]>([]);

  /* The preview follows what is TYPED, not what is saved, and falls back to
     the saved colour while a half-typed hex is not yet a colour. */
  const previewColor = normaliseHex(draftColor) ?? savedColor;
  const tokens = brandTokens(previewColor);

  const invalid = draftColor.trim() !== "" && "error" in validateBrandColor(draftColor);
  const colorProblem = invalid ? (validateBrandColor(draftColor) as { error: string }).error : null;

  function upload(file: File | null) {
    if (!file) return;
    if (file.size > MAX_BYTES) {
      toast({ tone: "bad", title: "That image is too large", text: "A booking page logo should be under 1 MB." });
      return;
    }
    startBusy(async () => {
      const ticket = await logoUploadUrl();
      if (!ticket.url) {
        toast({ tone: "bad", title: "Upload failed", text: ticket.error ?? "Could not start the upload." });
        return;
      }
      const posted = await fetch(ticket.url, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!posted.ok) {
        toast({ tone: "bad", title: "Upload failed", text: "The image could not be stored." });
        return;
      }
      const { storageId } = (await posted.json()) as { storageId: string };
      const saved = await saveLogo(storageId);
      if (saved.error) {
        toast({ tone: "bad", title: "Could not save", text: saved.error });
        return;
      }
      setLogo(saved.url ?? null);
      toast({ tone: "ok", title: "Logo saved", text: "It is on your booking page now." });
      router.refresh();
    });
  }

  function saveColor(value: string) {
    startBusy(async () => {
      const result = await setBrandColor(value);
      if (result.error) {
        toast({ tone: "bad", title: "Could not save", text: result.error });
        return;
      }
      setSavedColor(result.color ?? null);
      setDraftColor(result.color ?? "");
      toast({
        tone: "ok",
        title: result.color ? "Colour saved" : "Back to Meetrao green",
        text: result.color ? "Your booking page uses it now." : "Your pages use the default colour.",
      });
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-[15px]">
      <PanelHeading
        title="Branding"
        subtitle="Your logo, your colour and your own domain on the pages guests see."
      />

      {!pro ? (
        <Callout tone="amber" title="Branding is part of Pro">
          Everything on this screen is set up and ready — it shows on your pages once you are on Pro.{" "}
          <Link href="/settings/billing">See the plans</Link>.
        </Callout>
      ) : null}

      {/* ── logo ──────────────────────────────────────────────────────── */}
      <section className="flex flex-col gap-[11px] rounded-[8px] border border-line bg-surface px-[15px] py-[14px]">
        <div className="flex flex-wrap items-center justify-between gap-[10px]">
          <span className="text-[13px] font-semibold text-ink">Your logo</span>
          {!pro ? <Badge tone="off" dot={false}>Pro</Badge> : null}
        </div>
        <Help>
          Shown at the top of your booking page in place of the Meetrao mark. PNG, JPG or WEBP, under 1 MB —
          a wide logo reads better than a tall one.
        </Help>

        <div className="flex flex-wrap items-center gap-[14px]">
          <div className="flex h-[52px] min-w-[120px] items-center justify-center rounded-[6px] border border-line bg-fill px-[14px]">
            {logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logo} alt="Your logo" className="block max-h-[28px] w-auto max-w-[150px] object-contain" />
            ) : (
              <Logo height={18} />
            )}
          </div>

          <input
            ref={input}
            type="file"
            accept={ACCEPT}
            className="hidden"
            onChange={(e) => {
              upload(e.target.files?.[0] ?? null);
              // Reset, so picking the same file twice still fires a change.
              e.target.value = "";
            }}
          />

          <Button
            variant="secondary"
            size={32}
            icon="upload"
            disabled={!pro || busy}
            onClick={() => input.current?.click()}
          >
            {logo ? "Change logo" : "Upload logo"}
          </Button>

          {logo ? (
            <Button
              variant="ghost"
              size={32}
              disabled={busy}
              onClick={() =>
                startBusy(async () => {
                  const result = await removeLogo();
                  if (result.error) {
                    toast({ tone: "bad", title: "Could not remove", text: result.error });
                    return;
                  }
                  setLogo(null);
                  toast({ tone: "neutral", title: "Logo removed", text: "The Meetrao mark is shown instead." });
                  router.refresh();
                })
              }
            >
              Remove
            </Button>
          ) : null}
        </div>
      </section>

      {/* ── colour ────────────────────────────────────────────────────── */}
      <section className="flex flex-col gap-[11px] rounded-[8px] border border-line bg-surface px-[15px] py-[14px]">
        <div className="flex flex-wrap items-center justify-between gap-[10px]">
          <span className="text-[13px] font-semibold text-ink">Your colour</span>
          {!pro ? <Badge tone="off" dot={false}>Pro</Badge> : null}
        </div>
        <Help>
          One colour. Buttons, the chosen date and every highlight are worked out from it, and the text on
          top is picked so a guest can read it.
        </Help>

        <div className="flex flex-wrap items-end gap-[10px]">
          <Field label="Hex" htmlFor="brand-color" className="min-w-[130px] max-w-[180px] flex-1">
            <Input
              id="brand-color"
              height={36}
              placeholder="#14554A"
              spellCheck={false}
              disabled={!pro}
              invalid={invalid}
              value={draftColor}
              onChange={(e) => setDraftColor(e.target.value)}
            />
          </Field>

          {/* The OS colour picker, for a host who has a swatch rather than a
              hex. It only ever emits valid hex, so it saves on change. */}
          <label className="flex flex-col gap-[5px]">
            <Label>Pick</Label>
            <input
              type="color"
              aria-label="Pick a colour"
              disabled={!pro}
              value={previewColor ?? "#14554a"}
              onChange={(e) => setDraftColor(e.target.value)}
              className="h-[36px] w-[44px] cursor-pointer rounded-[6px] border border-line-strong bg-surface p-[3px] disabled:cursor-not-allowed disabled:opacity-45"
            />
          </label>

          <Button
            variant="accent"
            size={36}
            busy={busy}
            disabled={!pro || invalid || draftColor.trim() === ""}
            onClick={() => saveColor(draftColor)}
          >
            Save colour
          </Button>

          {savedColor ? (
            <Button variant="ghost" size={36} disabled={busy} onClick={() => saveColor("")}>
              Reset
            </Button>
          ) : null}
        </div>

        {colorProblem ? (
          <span className="text-[12px] leading-[1.5] text-red">{colorProblem}</span>
        ) : null}

        <div className="flex flex-wrap items-center gap-[7px]">
          <span className="text-[11.5px] text-ink-3">Try:</span>
          {SUGGESTED.map((swatch) => (
            <button
              key={swatch}
              type="button"
              disabled={!pro}
              aria-label={`Use ${swatch}`}
              onClick={() => setDraftColor(swatch)}
              className="h-[22px] w-[22px] cursor-pointer rounded-full border border-line-strong disabled:cursor-not-allowed disabled:opacity-45"
              style={{ background: swatch }}
            />
          ))}
        </div>

        <BrandPreview tokens={tokens} logo={logo} />
      </section>

      {/* ── their own domain ──────────────────────────────────────────── */}
      <section className="flex flex-col gap-[11px] rounded-[8px] border border-line bg-surface px-[15px] py-[14px]">
        <div className="flex flex-wrap items-center justify-between gap-[10px]">
          <span className="text-[13px] font-semibold text-ink">Your own domain</span>
          {!pro ? (
            <Badge tone="off" dot={false}>Pro</Badge>
          ) : domain.verifiedAt ? (
            <Badge tone="ok">Live</Badge>
          ) : null}
        </div>

        <Help>
          Point a name you own at us and your booking page answers there. Add the record below and we will
          check it — DNS usually takes a few minutes.
        </Help>

        {/* What the link actually becomes, both ways round. Written out
            because "a custom domain" does not tell a host what they will be
            able to put in their email signature. */}
        <div className="flex flex-col gap-[4px] rounded-[6px] border border-line bg-fill px-[12px] py-[10px]">
          <span className="text-[11.5px] text-ink-3">Today</span>
          <span className="text-[12.5px] break-all text-ink-2">
            {siteHost}/{username}
          </span>
          <span className="mt-[4px] text-[11.5px] text-ink-3">With your domain</span>
          <span className="text-[12.5px] break-all font-semibold text-ink">
            {(domain.domain || "meeting.yourcompany.com")}/{username}
          </span>
          <span className="text-[11.5px] leading-[1.5] text-ink-3">
            The bare domain works too, and so does a link straight to one meeting.
          </span>
        </div>

        <div className="flex flex-wrap items-end gap-[10px]">
          <Field label="Domain" htmlFor="custom-domain" className="min-w-[200px] flex-1">
            <Input
              id="custom-domain"
              height={36}
              placeholder="meeting.yourcompany.com"
              spellCheck={false}
              disabled={!pro}
              value={draftDomain}
              onChange={(e) => setDraftDomain(e.target.value)}
            />
          </Field>
          <Button
            variant="secondary"
            size={36}
            busy={busy}
            disabled={!pro}
            onClick={() =>
              startBusy(async () => {
                const result = await claimDomain(draftDomain);
                if (result.error) {
                  toast({ tone: "bad", title: "Could not claim", text: result.error });
                  return;
                }
                if (result.state?.status === "unconfigured") {
                  toast({
                    tone: "warn",
                    title: "Not available yet",
                    text: "Custom domains are not configured on this deployment.",
                  });
                  return;
                }
                if (result.state?.status === "pending") setRecords(result.state.records);
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
                  toast({ tone: "ok", title: "Domain removed", text: `Your ${siteHost} link keeps working.` });
                  router.refresh();
                })
              }
            >
              Remove
            </Button>
          </div>
        ) : null}
      </section>
    </div>
  );
}

/**
 * The booking page's own parts, in the colour being typed.
 *
 * Not a screenshot and not an iframe: the same tokens the real page binds, on
 * the pieces a colour actually changes — the mark, a chosen date, the confirm
 * button and a highlight. An iframe would be truer and would also need a save
 * before it could show anything, which is the problem this solves.
 */
function BrandPreview({
  tokens,
  logo,
}: {
  tokens: ReturnType<typeof brandTokens>;
  logo: string | null;
}) {
  const style = tokens
    ? ({
        "--accent": tokens.accent,
        "--accent-2": tokens.accentHover,
        "--accent-ink": tokens.accentText,
        "--on-accent": tokens.onAccent,
        "--accent-soft": tokens.soft,
        "--accent-line": tokens.line,
      } as React.CSSProperties)
    : undefined;

  return (
    <div className="flex flex-col gap-[8px]">
      <Label>Preview</Label>
      <div
        style={style}
        className="flex flex-col gap-[12px] rounded-[8px] border border-line bg-surface px-[14px] py-[13px]"
      >
        <div className="flex items-center justify-between gap-[10px] border-b border-line pb-[10px]">
          {logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logo} alt="" className="block max-h-[18px] w-auto max-w-[110px] object-contain" />
          ) : (
            <Logo height={16} />
          )}
          <span className="text-[10px] font-semibold tracking-[0.08em] text-ink-3 uppercase">Booking page</span>
        </div>

        <div className="flex flex-wrap items-center gap-[8px]">
          {/* A chosen date and an unchosen one, side by side: the pair is what
              shows whether a colour reads as "selected" at all. */}
          <span className="inline-flex h-[34px] w-[34px] items-center justify-center rounded-[6px] border border-accent bg-accent text-[13px] font-semibold text-on-accent">
            14
          </span>
          <span className="inline-flex h-[34px] w-[34px] items-center justify-center rounded-[6px] border border-line-strong bg-surface text-[13px] text-ink">
            15
          </span>
          <span className="inline-flex items-center rounded-[5px] border border-accent-line bg-accent-soft px-[9px] py-[4px] text-[11.5px] font-semibold text-accent-ink">
            09:30
          </span>
          <span className="inline-flex h-[32px] items-center rounded-[6px] border border-accent bg-accent px-[12px] text-[12.5px] font-semibold text-on-accent">
            Confirm
          </span>
          <span className="text-[12.5px] font-semibold text-accent-ink">A link in your colour</span>
        </div>
      </div>
    </div>
  );
}
