import { SiteFooter, SiteNav } from "@/components/marketing/site-chrome";
import { signOut } from "@/lib/actions/auth";

/* The marketing layout: one nav, one footer, built once.

   Still deliberately does not read the session ON THE SERVER. Doing so would
   opt the landing page, Terms and Privacy out of static rendering, and the
   landing page is the one page whose time-to-first-byte a search engine
   measures, so that is a bad trade in general and a strange one with an SEO
   brief open.

   The nav is signed-in-aware all the same: `liveAccount` hands the job to the
   browser, which reads the session after hydration and swaps the two sign-up
   buttons for the account menu. /help and /support keep resolving it on the
   server (they are dynamic anyway) so those two get the right nav with no
   swap at all. See components/marketing/site-account-live.tsx. */
export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#F4F3ED]">
      <SiteNav liveAccount={{ onSignOut: signOut }} />
      {children}
      <SiteFooter />
    </div>
  );
}
