import Link from "next/link";

/* The four screens a guest sees with no account. They get their own legal
   footer, because a guest has no settings page to find these links in. */
export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <div className="box-border flex flex-1 items-start justify-center p-[20px]">{children}</div>

      <div className="flex flex-wrap items-center justify-center gap-x-[18px] gap-y-[8px] px-[20px] pb-[40px]">
        <span className="text-[12px] text-ink-3">
          Powered by <Link href="/">Meetrao</Link>
        </span>
        <span aria-hidden="true" className="h-[3px] w-[3px] flex-none rounded-full bg-line-strong" />
        <FooterLink href="/terms">Terms</FooterLink>
        <FooterLink href="/privacy">Privacy</FooterLink>
        <FooterLink href="/support">Support</FooterLink>
      </div>
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
