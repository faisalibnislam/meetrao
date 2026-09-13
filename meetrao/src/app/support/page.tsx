import type { Metadata } from "next";
import { AppShell } from "@/components/app/app-shell";
import { SiteFooter, SiteNav } from "@/components/marketing/site-chrome";
import { SupportBody } from "@/components/marketing/support-body";
import { optionalSession } from "@/lib/data/session";

/* Deliberately outside both route groups.
   
   One URL, two shells. A host who clicks Support in the account menu stays
   inside the product, with their sidebar and their identity already filled in;
   a visitor who finds it from the footer gets the marketing chrome. Two routes
   would have meant two pages to keep in step, and the body is identical. */

export const metadata: Metadata = {
  title: "Contact Support",
  description:
    "Something not working, or a question about your booking link? Tell us what you tried and " +
    "what happened instead. A person reads every message.",
  alternates: { canonical: "/support" },
};

export default async function SupportPage() {
  const session = await optionalSession();

  const body = (
    <SupportBody
      signedIn={Boolean(session)}
      accountName={session ? session.profile.full_name || session.profile.username : ""}
      accountEmail={session?.profile.email ?? ""}
      helpInNewTab={Boolean(session)}
    />
  );

  if (session) {
    return (
      <AppShell profile={session.profile}>
        <div className="min-h-0 flex-1 overflow-auto">{body}</div>
      </AppShell>
    );
  }

  return (
    <div className="min-h-screen bg-[#F4F3ED]">
      <SiteNav />
      {body}
      <SiteFooter />
    </div>
  );
}
