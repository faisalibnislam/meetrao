import type { Metadata } from "next";

/* ─────────────────────────────────────────────────────────────────────────────
   The widget's own shell: no nav, no footer, no page ground.

   A host drops this into their own page, so everything that frames the product
   on meetrao.com is wrong here. The chrome belongs to their site. The
   background is transparent for the same reason: the widget sits on whatever
   colour they already have, and a beige card floating on a white page is the
   giveaway that something was embedded rather than built in.

   THE TRANSPARENCY NEEDED THE RULE BELOW TO BE TRUE. Only the div was
   transparent; `html, body { background: var(--ground) }` in globals.css still
   painted the page behind it, so every embed shipped with our beige after all
  , quietly, because beige on a light site barely registers. It stopped being
   quiet when a Pro host's own background started filling that same space with
   a deliberate colour. Both are wrong here, so both are turned off.

   Never indexed. The same booking page already exists at a URL search engines
   can have; two of everything is a duplicate-content problem and the wrong one
   would sometimes win.
   ───────────────────────────────────────────────────────────────────────────── */

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function EmbedLayout({ children }: { children: React.ReactNode }) {
  /* `items-start` is load-bearing. A flex child stretches to its container by
     default, and the container stretches to the iframe, so the content would
     report whatever height the parent already set, and the widget could grow
     but never shrink. Starting the child at its own height is what makes it
     measurable. EmbedHeight measures the child, not this. */
  return (
    <>
      <style>{"html,body{background:transparent}"}</style>
      <div id="mr-embed-root" className="flex min-h-0 items-start justify-center bg-transparent p-[12px]">
        {children}
      </div>
    </>
  );
}
