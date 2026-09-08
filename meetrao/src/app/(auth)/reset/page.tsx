import type { Metadata } from "next";
import { AuthCard } from "@/components/auth/auth-card";
import { ResetForm } from "@/components/auth/reset-form";

export const metadata: Metadata = { title: "Set a new password" };

/* Reached from the emailed reset link, which /auth/confirm has already
   exchanged for a session. */
export default function ResetPage() {
  return (
    <AuthCard title="Set a new password" blurb="Choose something you have not used here before.">
      <ResetForm />
    </AuthCard>
  );
}
