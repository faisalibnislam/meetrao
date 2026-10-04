import type { Metadata } from "next";
import { ButtonLink } from "@/components/ui/button";
import { StatusPage } from "@/components/ui/status-page";

export const metadata: Metadata = { title: "Not found" };

/* Every notFound() lands here: a mistyped link, a meeting the host switched
   off, a booking reference that does not exist. Which one it was is not
   something this page can know, so it says what is true of all of them and
   offers the one way forward that always works. */
export default function NotFound() {
  return (
    <StatusPage
      icon="search"
      tone="neutral"
      title="There's nothing at this address"
      actions={
        <ButtonLink variant="accent" size={38} href="/">
          Go to the home page
        </ButtonLink>
      }
    >
      The link may have a typo in it, or the page it pointed to has been taken down. If someone sent it to you, it is
      worth asking them for it again.
    </StatusPage>
  );
}
