import type { Metadata } from "next";
import { AuthCard } from "@/components/auth/auth-card";
import { ResetForm } from "@/components/auth/reset-form";
import { convexServes } from "@/lib/backend";

export const metadata: Metadata = { title: "Set a new password" };

/* Reached from the emailed reset link.
 *
 * On Supabase that link goes through /auth/confirm, which exchanges it for a
 * session, so the form needs nothing but a new password. Convex Auth emails a
 * CODE instead and creates no session, so the address and the code ride in the
 * query string and are handed to the form. */
export default async function ResetPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; code?: string }>;
}) {
  const { email, code } = await searchParams;

  return (
    <AuthCard title="Set a new password" blurb="Choose something you have not used here before.">
      <ResetForm convexAuth={convexServes("auth")} email={email ?? ""} code={code ?? ""} />
    </AuthCard>
  );
}
