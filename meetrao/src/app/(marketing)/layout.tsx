import { SiteNav } from "@/components/marketing/site-nav";
import { SiteFooter } from "@/components/marketing/site-footer";

/**
 * Chrome for every page that does not require a login: the landing page and the
 * four standalone public pages.
 *
 * The nav and footer are built once here. The prototype duplicates them across
 * five files because it has no layout primitive — that duplication is not worth
 * carrying into a codebase that does.
 */
export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col bg-ground">
      <SiteNav />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}
