import { SiteFooter, SiteNav } from "@/components/marketing/site-chrome";

/* The marketing layout: one nav, one footer, built once. */
export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#F4F3ED]">
      <SiteNav />
      {children}
      <SiteFooter />
    </div>
  );
}
