import type { ReactNode } from "react";

/**
 * A plain anchor for handing off to a Route Handler that redirects somewhere
 * else — `/api/google/connect` 302s to Google's consent screen.
 *
 * `next/link` cannot be used for these: it would try a client-side RSC
 * navigation to a route that returns a redirect, not a page. Keeping it in one
 * component also documents why, instead of scattering lint suppressions.
 */
export function RouteLink({
  href,
  className,
  children,
}: {
  href: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <a href={href} className={className}>
      {children}
    </a>
  );
}
