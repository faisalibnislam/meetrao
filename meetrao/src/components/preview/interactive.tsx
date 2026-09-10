"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  CheckBox,
  ChoiceChip,
  Field,
  Input,
  SearchField,
  Switch,
  Textarea,
} from "@/components/ui/controls";
import { MenuSelect } from "@/components/ui/menu-select";
import { Modal, DetailRow } from "@/components/ui/modal";
import { ToastProvider, useToast } from "@/components/ui/toast";
import { Row, Specimen } from "./kit";

/* ─────────────────────────────────────────────────────────────────────────────
   The stateful half of the gallery.

   Everything that needs a handler or a piece of state lives here, and nowhere
   else — the rest of /preview is server-rendered. Keeping the boundary this
   sharp is not tidiness: a "use client" module's exports become client
   references on the server, and calling one from a server file throws at
   request time. Two onboarding steps and the Settings screen shipped that bug.
   ───────────────────────────────────────────────────────────────────────────── */

const DURATIONS = [15, 30, 45, 60];

const ZONES = [
  { value: "Asia/Dhaka", label: "Asia/Dhaka" },
  { value: "America/New_York", label: "America/New_York" },
  { value: "Europe/London", label: "Europe/London" },
  { value: "Australia/Sydney", label: "Australia/Sydney" },
];

export function InteractiveControls() {
  const [on, setOn] = useState(true);
  const [checked, setChecked] = useState(true);
  const [duration, setDuration] = useState(30);
  const [zone, setZone] = useState("Asia/Dhaka");
  const [query, setQuery] = useState("");

  return (
    <div className="flex flex-col gap-[12px]">
      <Row>
        <Specimen caption='<Switch checked onChange label="…" />'>
          <Switch checked={on} onChange={setOn} label="Demo switch" />
          <Switch checked={!on} onChange={(v) => setOn(!v)} label="Demo switch, inverted" />
          <Switch checked disabled onChange={() => {}} label="Disabled, on" />
          <Switch checked={false} disabled onChange={() => {}} label="Disabled, off" />
        </Specimen>

        <Specimen caption="<CheckBox checked /> — the row is the hit target, not the box">
          <label className="flex cursor-pointer items-center gap-[9px] text-[13px] text-ink">
            <input
              type="checkbox"
              checked={checked}
              onChange={(e) => setChecked(e.target.checked)}
              className="sr-only"
            />
            <CheckBox checked={checked} />
            Monday
          </label>
          <CheckBox checked={false} />
        </Specimen>
      </Row>

      <Specimen caption="<ChoiceChip selected onClick>">
        {DURATIONS.map((d) => (
          <ChoiceChip key={d} selected={duration === d} onClick={() => setDuration(d)}>
            {d} min
          </ChoiceChip>
        ))}
      </Specimen>

      <Row>
        <Specimen caption='<MenuSelect options value onChange searchable />' className="min-w-[280px] flex-1">
          <div className="w-full max-w-[300px]">
            <MenuSelect options={ZONES} value={zone} onChange={setZone} searchable aria-label="Timezone" />
          </div>
        </Specimen>

        <Specimen caption="<SearchField value onValueChange placeholder />" className="min-w-[260px] flex-1">
          <SearchField value={query} onValueChange={setQuery} placeholder="Search bookings" />
        </Specimen>
      </Row>

      <Row>
        <Specimen caption='<Field label help> + <Input height={34} />' className="min-w-[280px] flex-1">
          <div className="w-full">
            <Field label="Meeting name" htmlFor="pv-name" help="Shown to guests on your booking page.">
              <Input id="pv-name" height={34} defaultValue="Intro call" />
            </Field>
          </div>
        </Specimen>

        <Specimen caption='<Field label error> + <Input invalid />' className="min-w-[280px] flex-1">
          <div className="w-full">
            <Field label="Username" htmlFor="pv-user" error="That username is already taken.">
              <Input id="pv-user" height={34} defaultValue="faisal" invalid />
            </Field>
          </div>
        </Specimen>
      </Row>

      <Specimen caption="<Textarea rows={3} />">
        <div className="w-full">
          <Textarea rows={3} defaultValue="Anything you'd like me to know before we meet?" className="w-full" />
        </div>
      </Specimen>
    </div>
  );
}

export function InteractiveOverlays() {
  return (
    <ToastProvider>
      <OverlayDemos />
    </ToastProvider>
  );
}

function OverlayDemos() {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [wide, setWide] = useState(false);
  const [busy, setBusy] = useState(false);

  return (
    <div className="flex flex-col gap-[12px]">
      <Specimen caption="<Modal open onClose title primary secondary /> — 400px, or 460px with wide">
        <Button
          variant="secondary"
          size={32}
          onClick={() => {
            setWide(false);
            setOpen(true);
          }}
        >
          Open modal
        </Button>
        <Button
          variant="secondary"
          size={32}
          onClick={() => {
            setWide(true);
            setOpen(true);
          }}
        >
          Open wide modal
        </Button>
      </Specimen>

      <Specimen caption='useToast()({ tone, title, text }) — four tones, auto-dismiss at 3200ms'>
        {(["ok", "bad", "warn", "neutral"] as const).map((tone) => (
          <Button
            key={tone}
            variant="secondary"
            size={30}
            onClick={() => toast({ tone, title: `Toast: ${tone}`, text: "meetrao.com/faisal" })}
          >
            {tone}
          </Button>
        ))}
      </Specimen>

      <Specimen caption="<Button busy /> — the glyph slot becomes a spinner, the label stays put">
        <Button
          variant="accent"
          size={32}
          busy={busy}
          onClick={() => {
            setBusy(true);
            setTimeout(() => setBusy(false), 2000);
          }}
        >
          Save changes
        </Button>
        <Button variant="accent" size={32} busy>
          Always busy
        </Button>
        <Button variant="danger" size={32} busy>
          Deleting
        </Button>
      </Specimen>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        wide={wide}
        title="Cancel this booking?"
        subtitle="The guest is emailed straight away and the calendar event is removed."
        primary={{ label: "Cancel booking", onClick: () => setOpen(false), variant: "danger" }}
        secondary={{ label: "Keep it", onClick: () => setOpen(false) }}
      >
        <div className="flex flex-col gap-[9px]">
          <DetailRow label="Guest" value="Priya Raman" />
          <DetailRow label="When" value="Thursday, September 10 · 10:00 – 10:30 AM" />
          <DetailRow label="Reference" value="bkm-4f2a91" machine />
        </div>
      </Modal>
    </div>
  );
}
