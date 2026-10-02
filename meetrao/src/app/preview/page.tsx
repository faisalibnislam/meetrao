import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MetricCard, type MetricTone } from "@/components/app/metric-card";
import { Bare, Caption, Grid, Row, Section, Specimen } from "@/components/preview/kit";
import { InteractiveControls, InteractiveOverlays } from "@/components/preview/interactive";
import { TokenSwatch, TokenValue } from "@/components/preview/swatches";
import { Avatar, Badge, Eyebrow, type Tone } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { BUTTON_SIZES, BUTTON_VARIANTS } from "@/components/ui/button-class";
import { FILLED_ICONS, ICON_NAMES, Icon } from "@/components/ui/icon";
import { GoogleG, Logo } from "@/components/ui/logo";
import { Callout, Card, EmptyState, PanelHeading, SectionHeading, TableCard } from "@/components/ui/panels";
import { Spinner } from "@/components/ui/spinner";
import { StackedCell, Table, Td, Th, Tr } from "@/components/ui/table";
import { optionalSession } from "@/lib/data/session";
import { previewEnabled } from "@/lib/preview";

/* ─────────────────────────────────────────────────────────────────────────────
   /preview, every UI primitive, in every state, on one page.

   Why it exists: the alternative to this page is booting an authenticated
   screen and hunting for the one component you changed. Here the whole
   vocabulary is visible at once, which is what makes an inconsistency findable
   at all, and it renders in a single request with no session.

   Two rules keep it honest:

     · It enumerates from the source. Icons come from ICON_NAMES, buttons from
       BUTTON_VARIANTS × BUTTON_SIZES, colours from the cascade itself. A list
       retyped here is a list that goes stale, and a gallery that lies about the
       system is worse than no gallery.
     · It adds no colour, size or radius of its own. Everything below is a token
       or a component; the page's own chrome is deliberately plain.
   ───────────────────────────────────────────────────────────────────────────── */

export const metadata: Metadata = {
  title: "Component preview",
  // A branch deployment should never be indexed, and this page least of all.
  robots: { index: false, follow: false },
};

const NAV: [string, string][] = [
  ["tokens", "Tokens"],
  ["type", "Type"],
  ["icons", "Icons"],
  ["buttons", "Buttons"],
  ["status", "Status"],
  ["panels", "Panels"],
  ["metrics", "Metrics"],
  ["controls", "Controls"],
  ["table", "Table"],
  ["overlays", "Overlays"],
  ["brand", "Brand"],
];

const SURFACE_TOKENS = ["--ground", "--surface", "--fill", "--fill-2", "--sidebar"];
const LINE_TOKENS = ["--line", "--line-soft", "--line-strong"];
const INK_TOKENS = ["--ink", "--ink-2", "--ink-3"];
const ACCENT_TOKENS = ["--accent", "--accent-2", "--accent-soft", "--accent-line", "--accent-soft-hover"];
const STATUS_TOKENS = [
  "--red", "--red-soft", "--red-line", "--red-hover", "--red-ink",
  "--amber", "--amber-soft", "--amber-line", "--amber-ink",
  "--slate", "--slate-soft", "--slate-line",
];

const TYPE_SCALE: [string, string, string][] = [
  ["10px / 0.07em", "text-[10px] tracking-[0.07em] uppercase", "EYEBROW, SMALL"],
  ["10.5px / 0.08em", "text-[10.5px] tracking-[0.08em] uppercase", "EYEBROW, LARGE"],
  ["11.5px", "text-[11.5px]", "Metric note, sidebar email"],
  ["12px", "text-[12px]", "Table second line, crumbs"],
  ["12.5px", "text-[12.5px]", "Body small: the app's workhorse"],
  ["13px", "text-[13px]", "Nav rows, menu items, empty-state text"],
  ["13.5px", "text-[13.5px]", "Row primary, button label at 36–40"],
  ["14px", "text-[14px]", "Empty-state title, button at 42–44"],
  ["14.5px", "text-[14.5px]", "Section and panel headings"],
  ["15.5px", "text-[15.5px]", "Landing body"],
  ["19px", "text-[19px] font-semibold tracking-[-0.012em]", "Screen title"],
  ["26px", "text-[26px] font-semibold tracking-[-0.022em]", "Metric value"],
];

export default async function PreviewPage() {
  // Two doors. Dev and preview deployments are open, because there is nothing
  // to protect there. Production is admin-only rather than closed: the gallery
  // is most useful exactly when you are away from a terminal, and a 404 that
  // nobody can get past is a tool nobody uses.
  //
  // notFound(), not a redirect: a stranger should not learn the route exists.
  if (!previewEnabled()) {
    const session = await optionalSession();
    if (!session?.profile.is_admin) notFound();
  }

  return (
    <div className="min-h-screen bg-ground">
      <header className="sticky top-0 z-60 border-b border-line bg-ground/95 backdrop-blur-[6px]">
        <div className="mx-auto flex max-w-[1180px] flex-wrap items-center gap-x-[16px] gap-y-[8px] px-[26px] py-[12px] max-[720px]:px-[16px]">
          <span className="flex flex-none items-center gap-[10px]">
            <Logo height={18} />
            <span className="text-[13px] font-semibold text-ink">Components</span>
          </span>
          <nav className="flex min-w-0 flex-wrap gap-x-[14px] gap-y-[4px]">
            {NAV.map(([id, label]) => (
              <a key={id} href={`#${id}`} className="text-[12.5px] text-ink-2">
                {label}
              </a>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto flex max-w-[1180px] flex-col gap-[54px] px-[26px] pt-[30px] pb-[120px] max-[720px]:px-[16px]">
        <div className="flex flex-col gap-[6px]">
          <h1 className="m-0 font-serif text-[38px] leading-[1.08] font-normal tracking-[-0.012em] text-ink">
            Meetrao components
          </h1>
          <p className="m-0 max-w-[68ch] text-[13px] leading-[1.65] text-ink-2">
            Every primitive the product is built from, in every state it ships in. Enumerated from the source, so
            adding an icon, a button variant or a control height shows up here without editing this page.
          </p>
        </div>

        <Section
          id="tokens"
          title="Tokens"
          note="Read live from the cascade: these are the values the browser resolves right now, not a copy of globals.css."
        >
          <Bare>
            <Caption>Surfaces</Caption>
            <Grid min={210}>
              {SURFACE_TOKENS.map((t) => (
                <TokenSwatch key={t} name={t} />
              ))}
            </Grid>
          </Bare>
          <Bare>
            <Caption>Lines</Caption>
            <Grid min={210}>
              {LINE_TOKENS.map((t) => (
                <TokenSwatch key={t} name={t} />
              ))}
            </Grid>
          </Bare>
          <Bare>
            <Caption>Ink</Caption>
            <Grid min={210}>
              {INK_TOKENS.map((t) => (
                <TokenSwatch key={t} name={t} />
              ))}
            </Grid>
          </Bare>
          <Bare>
            <Caption>Accent</Caption>
            <Grid min={210}>
              {ACCENT_TOKENS.map((t) => (
                <TokenSwatch key={t} name={t} />
              ))}
            </Grid>
          </Bare>
          <Bare>
            <Caption>Status: never used decoratively</Caption>
            <Grid min={210}>
              {STATUS_TOKENS.map((t) => (
                <TokenSwatch key={t} name={t} />
              ))}
            </Grid>
          </Bare>
          <Bare>
            <Caption>Shadows and families</Caption>
            <Grid min={230}>
              <TokenValue name="--nav-shadow" sample="shadow" />
              <TokenValue name="--pop" sample="shadow" />
              <TokenValue name="--hero-shadow" sample="shadow" />
              <TokenValue name="--sans" sample="font" />
              <TokenValue name="--serif" sample="font" />
            </Grid>
          </Bare>
        </Section>

        <Section id="type" title="Type" note="The sizes the design actually uses. They are irregular on purpose, half-pixel steps are not a mistake to tidy.">
          <Card className="flex flex-col divide-y divide-line-soft">
            {TYPE_SCALE.map(([label, cls, sample]) => (
              <div key={label} className="flex flex-wrap items-baseline gap-x-[18px] gap-y-[4px] px-[14px] py-[11px]">
                <code className="w-[120px] flex-none text-[11px] text-ink-3">{label}</code>
                <span className={`min-w-0 flex-1 text-ink ${cls}`}>{sample}</span>
              </div>
            ))}
            <div className="flex flex-wrap items-baseline gap-x-[18px] gap-y-[4px] px-[14px] py-[11px]">
              <code className="w-[120px] flex-none text-[11px] text-ink-3">serif, display</code>
              <span className="min-w-0 flex-1 font-serif text-[38px] leading-[1.08] text-ink">
                Good morning, Faisal.
              </span>
            </div>
          </Card>
        </Section>

        <Section
          id="icons"
          title={`Icons, ${ICON_NAMES.length}`}
          note="Drawn in-house on a 24-unit grid with square caps and mitred joins. Light is the default; the seven filled glyphs below carry status."
        >
          <Card>
            <div className="grid gap-px bg-line-soft" style={{ gridTemplateColumns: "repeat(auto-fill,minmax(112px,1fr))" }}>
              {ICON_NAMES.map((name) => (
                <div key={name} className="flex flex-col items-center gap-[7px] bg-surface px-[6px] py-[13px]">
                  <Icon name={name} size={18} weight={FILLED_ICONS.includes(name) ? "solid" : "light"} className="text-ink" />
                  <code className="w-full text-center text-[9.5px] leading-[1.3] break-all text-ink-3">
                    {name}
                  </code>
                </div>
              ))}
            </div>
          </Card>
          <Row>
            <Specimen caption='weight="light" (default) vs weight="solid", 1.4 and 2.3 stroke'>
              <Icon name="check" size={20} weight="light" />
              <Icon name="check" size={20} weight="solid" />
              <Icon name="xmark" size={20} weight="light" />
              <Icon name="xmark" size={20} weight="solid" />
            </Specimen>
            <Specimen caption="size, 8 to 20px is the range the design references">
              {[8, 10, 11, 13, 16, 18, 20].map((s) => (
                <Icon key={s} name="calendar" size={s} />
              ))}
            </Specimen>
          </Row>
        </Section>

        <Section
          id="buttons"
          title="Buttons"
          note={`${BUTTON_VARIANTS.length} variants × ${BUTTON_SIZES.length} heights, enumerated from button-class.ts. One style string serves <button> and <a>, with box-sizing pinned so both compute the same height.`}
        >
          <TableCard>
            <Table minWidth={720}>
              <thead>
                <tr>
                  <Th>size</Th>
                  {BUTTON_VARIANTS.map((v) => (
                    <Th key={v}>{v}</Th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {BUTTON_SIZES.map((size) => (
                  <Tr key={size}>
                    <Td>
                      <code className="text-[11.5px] text-ink-3">{size}</code>
                    </Td>
                    {BUTTON_VARIANTS.map((variant) => (
                      <Td key={variant}>
                        <Button variant={variant} size={size}>
                          Button
                        </Button>
                      </Td>
                    ))}
                  </Tr>
                ))}
              </tbody>
            </Table>
          </TableCard>

          <Row>
            <Specimen caption="icon, leading glyph, sized for the control height">
              <Button variant="accent" size={30} icon="plus">Create meeting</Button>
              <Button variant="secondary" size={30} icon="copy">Copy link</Button>
              <Button variant="ghost" size={30} icon="rotate-left">Reset</Button>
            </Specimen>
            <Specimen caption="disabled, 45% opacity, not-allowed cursor">
              <Button variant="accent" size={32} disabled>Save</Button>
              <Button variant="secondary" size={32} disabled>Cancel</Button>
              <Button variant="danger" size={32} disabled>Delete</Button>
            </Specimen>
          </Row>

          <Row>
            <Specimen caption="<ButtonLink href>, the same string on an anchor" className="min-w-[280px] flex-1">
              <ButtonLink href="/preview" variant="accent" size={32}>Anchor, accent</ButtonLink>
              <ButtonLink href="/preview" variant="secondary" size={32} trailingIcon="arrow-right">
                With trailing
              </ButtonLink>
              <ButtonLink href="/preview" variant="amber" size={28}>
                <GoogleG size={13} />
                Connect
              </ButtonLink>
            </Specimen>
            <Specimen caption="full, stretches to its container" className="min-w-[280px] flex-1">
              <div className="w-full">
                <Button variant="accent" size={38} full icon="plus">
                  New meeting
                </Button>
              </div>
            </Specimen>
          </Row>
        </Section>

        <Section id="status" title="Status" note="Badge, Avatar and Eyebrow. Status colour is identity here, never decoration.">
          <Row>
            <Specimen caption='<Badge tone>, "ok" | "bad" | "warn" | "off"'>
              {(["ok", "bad", "warn", "off"] as Tone[]).map((tone) => (
                <Badge key={tone} tone={tone}>
                  {tone === "ok" ? "Confirmed" : tone === "bad" ? "Cancelled" : tone === "warn" ? "Pending" : "Inactive"}
                </Badge>
              ))}
            </Specimen>
            <Specimen caption="<Badge dot={false}>, no status dot">
              {(["ok", "bad", "warn", "off"] as Tone[]).map((tone) => (
                <Badge key={tone} tone={tone} dot={false}>
                  {tone}
                </Badge>
              ))}
            </Specimen>
          </Row>
          <Row>
            <Specimen caption="<Avatar name size />, 24 · 26 · 28 · 32 · 38 · 42">
              {([24, 26, 28, 32, 38, 42] as const).map((size) => (
                <Avatar key={size} name="Faisal Islam" size={size} />
              ))}
            </Specimen>
            <Specimen caption='<Avatar tone="neutral" />'>
              {([26, 32, 38] as const).map((size) => (
                <Avatar key={size} name="Priya Raman" size={size} tone="neutral" />
              ))}
            </Specimen>
          </Row>
          <Specimen caption="<Eyebrow size={10} /> and size={10.5}">
            <Eyebrow size={10}>Your links</Eyebrow>
            <Eyebrow size={10.5}>Copy a booking link</Eyebrow>
          </Specimen>
        </Section>

        <Section id="panels" title="Panels" note="Card, Callout, EmptyState and the two headings.">
          <Grid min={330}>
            {(["amber", "red", "accent", "info"] as const).map((tone) => (
              <Bare key={tone}>
                <Callout
                  tone={tone}
                  title={tone === "red" ? "Something went wrong" : undefined}
                  action={<Button variant={tone === "amber" ? "amber" : "secondary"} size={28}>Action</Button>}
                >
                  A one-line explanation of the state, written so it says something true even when the action is
                  ignored.
                </Callout>
                <Caption>{`<Callout tone="${tone}" action>`}</Caption>
              </Bare>
            ))}
          </Grid>

          <Bare>
            <Callout tone="amber" align="center" action={<Button variant="amber" size={28}><GoogleG size={13} />Connect</Button>}>
              <strong className="font-semibold">Google Calendar isn&rsquo;t connected.</strong> Meetrao can&rsquo;t
              check for conflicts or add bookings to your calendar.
            </Callout>
            <Caption>{`align="center", the banner form, glyph and action on one line`}</Caption>
          </Bare>

          <Grid min={330}>
            <Bare>
              <EmptyState
                title="No upcoming meetings"
                text="Your scheduled meetings will appear here."
                action={<Button variant="accent" size={30} icon="plus">Create meeting</Button>}
              />
              <Caption>{`<EmptyState title text action>`}</Caption>
            </Bare>
            <Bare>
              <Card className="p-[16px]">
                <div className="flex flex-col gap-[16px]">
                  <SectionHeading title="Today" meta="2 meetings" right={<a href="#panels" className="text-[12.5px]">View all</a>} />
                  <PanelHeading title="Notifications" subtitle="What Meetrao emails you about." />
                </div>
              </Card>
              <Caption>{`<SectionHeading title meta right> · <PanelHeading title subtitle>`}</Caption>
            </Bare>
          </Grid>
        </Section>

        <Section id="metrics" title="Metric cards" note="The dashboard's four tinted cards. The colour is the card's identity.">
          <div className="grid gap-[12px]" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(196px,1fr))" }}>
            <MetricCard icon="calendar" tone="accent" value="5" label="Upcoming" note="Through Tue 15 Sep" trend="2 today" />
            <MetricCard icon="clock" tone="slate" value="10:00" label="Next meeting" note="with Priya Raman" trend="AM" />
            <MetricCard icon="list" tone="plain" value="3" unit="of 4" label="Active meetings" note="Bookable from your link" />
            <MetricCard icon="bolt" tone="amber" value="4.2" unit="hrs" label="Avg. reply time" note="From link opened to booked" />
          </div>
          <Caption>{`tone, ${(["accent", "slate", "amber", "plain"] as MetricTone[]).join(" · ")}`}</Caption>
        </Section>

        <Section id="controls" title="Controls" note="The stateful set. These render in a client island; everything else on this page is server-rendered.">
          <InteractiveControls />
        </Section>

        <Section id="table" title="Table" note="Th, Td, Tr and StackedCell inside a TableCard, which scrolls sideways rather than reflowing.">
          <TableCard>
            <Table minWidth={620}>
              <thead>
                <tr>
                  <Th>Guest</Th>
                  <Th>Meeting</Th>
                  <Th>When</Th>
                  <Th>Status</Th>
                  <Th align="right">Actions</Th>
                </tr>
              </thead>
              <tbody>
                <Tr>
                  <Td><StackedCell primary="Priya Raman" secondary="priya@nairstudio.com" /></Td>
                  <Td><span className="text-[13px] text-ink-2">Intro call · 30 min</span></Td>
                  <Td><StackedCell primary="Today" secondary="10:00 – 10:30 AM" /></Td>
                  <Td><Badge tone="ok">Confirmed</Badge></Td>
                  <Td className="text-right"><Button variant="ghost" size={26}>Details</Button></Td>
                </Tr>
                <Tr>
                  <Td><StackedCell primary="Dan Whitfield" secondary="dan@whitfield.dev" /></Td>
                  <Td><span className="text-[13px] text-ink-2">Product walkthrough · 45 min</span></Td>
                  <Td><StackedCell primary="Today" secondary="2:00 – 2:45 PM" /></Td>
                  <Td><Badge tone="warn">Pending</Badge></Td>
                  <Td className="text-right"><Button variant="ghost" size={26}>Details</Button></Td>
                </Tr>
                <Tr className="border-b-0">
                  <Td><StackedCell primary="Tomás Rivera" secondary="tomas@rivera.mx" /></Td>
                  <Td><span className="text-[13px] text-ink-2">Design review · 60 min</span></Td>
                  <Td><StackedCell primary="Sat 12 Sep" secondary="11:00 AM – 12:00 PM" /></Td>
                  <Td><Badge tone="bad">Cancelled</Badge></Td>
                  <Td className="text-right"><Button variant="ghost" size={26}>Details</Button></Td>
                </Tr>
              </tbody>
            </Table>
          </TableCard>
        </Section>

        <Section id="overlays" title="Overlays and loading" note="Modal, toast and the busy state. Click through them, they are live.">
          <Row>
            <Specimen caption='<Spinner tone="ink" | "accent" | "onFill" />'>
              <Spinner size={12} tone="ink" />
              <Spinner size={16} tone="ink" />
              <Spinner size={12} tone="accent" />
              <Spinner size={16} tone="accent" />
              <span className="inline-flex h-[32px] items-center rounded-[6px] bg-accent px-[12px]">
                <Spinner size={12} tone="onFill" />
              </span>
            </Specimen>
          </Row>
          <InteractiveOverlays />
        </Section>

        <Section id="brand" title="Brand" note="The supplied marks, used as-is.">
          <Row>
            <Specimen caption="<Logo height />, height drives width from the 576×127 ratio">
              <Logo height={16} />
              <Logo height={20} />
              <Logo height={28} />
            </Specimen>
            <Specimen caption="<GoogleG size />">
              <GoogleG size={13} />
              <GoogleG size={16} />
              <GoogleG size={20} />
            </Specimen>
          </Row>
        </Section>
      </main>
    </div>
  );
}
