import Link from "next/link";

/* ─────────────────────────────────────────────────────────────────────────────
   The footer under every guest-facing page.

   It lives in the pages rather than in the layout because the badge depends on
   whose page it is, and a layout cannot know. The legal links do NOT depend on
   that: a guest has no settings page to find Terms and Privacy in, so they
   appear whatever the host pays.

   src/app/public-footer.test.ts checks every page under (public) renders this,
   because the failure mode of moving it out of the layout is a page that
   quietly loses its legal links.
   ───────────────────────────────────────────────────────────────────────────── */

export function PublicFooter({ badge = true }: { badge?: boolean }) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-[18px] gap-y-[8px] px-[20px] pb-[40px]">
      {badge ? (
        <>
          <span className="text-[12px] text-ink-3">
            Powered by <Link href="/">Meetrao</Link>
          </span>
          <span aria-hidden="true" className="h-[3px] w-[3px] flex-none rounded-full bg-line-strong" />
        </>
      ) : null}
      <FooterLink href="/terms">Terms</FooterLink>
      <FooterLink href="/privacy">Privacy</FooterLink>
      <FooterLink href="/support">Support</FooterLink>
    </div>
  );
}

/* A standalone link in a row needs a 44px touch target; the negative margin
   keeps the row's visual height while the hit area stays honest. */
function FooterLink({ href, children }: { href: string; children: string }) {
  return (
    <Link href={href} className="my-[-14px] inline-flex min-h-[44px] items-center text-[12px] text-ink-3">
      {children}
    </Link>
  );
}
