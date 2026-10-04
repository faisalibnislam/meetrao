import { PanelHeading } from "@/components/ui/panels";
import { BUSINESS_PITCH, UpgradeCallout } from "./upgrade";

/* ─────────────────────────────────────────────────────────────────────────────
   The Team tab for a company that can hold one person.

   A team link is answered by whoever of you is free, so it needs a second
   person before it is anything at all. The panel underneath offered "Create a
   team" to somebody who could never add anyone to it, which is the worst
   version of a locked feature: it works right up until it cannot.

   What is useful here is the reason, so that is the whole screen.
   ───────────────────────────────────────────────────────────────────────── */

export function TeamPitch() {
  return (
    <section className="flex flex-col gap-[11px]">
      <PanelHeading
        title="Team"
        subtitle="One link, answered by whoever is free. Everyone keeps their own hours and calendar."
      />
      <UpgradeCallout to="business" feature="Team links">
        {BUSINESS_PITCH}
      </UpgradeCallout>
    </section>
  );
}
