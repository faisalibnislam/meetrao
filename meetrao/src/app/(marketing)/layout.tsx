import { SiteFooter, SiteNav } from "@/components/marketing/site-chrome";

/* The marketing layout: one nav, one footer, built once.

   Deliberately does not read the session. Doing so would opt the landing page,
   Terms and Privacy out of static rendering for the sake of a nav variant only
   the Help centre needs — so /help and /support render their own chrome
   instead, and everything under here stays static. */
export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#F4F3ED]">
      <SiteNav />
      {children}
      <SiteFooter />
    </div>
  );
}
