import type { Metadata } from "next";
import { AuthCard } from "@/components/auth/auth-card";
import { ResetForm } from "@/components/auth/reset-form";

export const metadata: Metadata = { title: "Set a new password" };

/* Reached from the emailed reset link.
 *
 * Convex Auth emails a CODE and creates no session, so the address and the
 * code ride in the query string and are handed to the form — there is nothing
 * signed in here to say who is asking. */
export default async function ResetPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; code?: string }>;
}) {
  const { email, code } = await searchParams;

  return (
    <AuthCard title="Set a new password" blurb="Choose something you have not used here before.">
      <ResetForm email={email ?? ""} code={code ?? ""} />
    </AuthCard>
  );
}
