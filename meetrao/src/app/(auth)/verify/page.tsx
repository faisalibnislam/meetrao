import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getVerificationState } from "@/lib/auth/verification";
import { VerifyCard } from "@/components/auth/verify-card";

export const metadata: Metadata = { title: "Confirm your email" };

export default async function VerifyPage() {
  const state = await getVerificationState();

  // Signed out, or already through the gate — this screen only exists for the
  // window between signing up and clicking the link.
  if (!state.email) redirect("/login");
  if (state.verified) redirect("/onboarding/1");

  return <VerifyCard email={state.email} />;
}
