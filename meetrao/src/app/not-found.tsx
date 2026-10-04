import type { Metadata } from "next";
import Link from "next/link";
import { buttonClass } from "@/components/ui/button-class";
import { Icon } from "@/components/ui/icon";
import { StatusPage } from "@/components/ui/status-page";

export const metadata: Metadata = { title: "Not found" };

/* Every notFound() lands here: a mistyped link, a meeting the host switched
   off, a booking reference that does not exist. Which one it was is not
   something this page can know, so it says what is true of all of them and
   offers the one way forward that always works.

   A plain Link with the button's classes rather than ButtonLink, and the icon
   rendered here on the server: this page is part of every route's first
   load, and ButtonLink's module would bring the whole icon set with it. */
export default function NotFound() {
  return (
    <StatusPage
      mark={<Icon name="search" size={16} />}
      tone="neutral"
      title="There's nothing at this address"
      actions={
        <Link href="/" className={buttonClass("accent", 38, "unlink no-underline")}>
          Go to the home page
        </Link>
      }
    >
      The link may have a typo in it, or the page it pointed to has been taken down. If someone sent it to you, it is
      worth asking them for it again.
    </StatusPage>
  );
}
