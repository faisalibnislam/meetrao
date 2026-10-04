import type { Metadata } from "next";
import { ButtonLink } from "@/components/ui/button";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { StatusPage } from "@/components/ui/status-page";

export const metadata: Metadata = { title: "Account suspended" };

/* Suspension blocks sign-in and stops new bookings, but leaves existing
   bookings on the calendar. It is reversible, and this page says so. */
export default function SuspendedPage() {
  return (
    <StatusPage
      icon="lock"
      tone="red"
      title="This account is suspended"
      actions={
        <>
          <ButtonLink variant="accent" size={38} href="/support">
            Contact support
          </ButtonLink>
          <SignOutButton />
        </>
      }
    >
      You can&rsquo;t sign in and your booking page is not taking new bookings. Meetings already on your calendar are
      unaffected.
    </StatusPage>
  );
}
