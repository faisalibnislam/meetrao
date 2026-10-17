import Link from "next/link";
import type { Metadata } from "next";
import { AuthCard } from "@/components/auth/auth-card";
import { AuthForm } from "@/components/auth/auth-form";

export const metadata: Metadata = { title: "Reset your password" };

export default function ForgotPage() {
  return (
    <AuthCard
      title="Reset your password"
      blurb="Enter your work email and we'll send a link to set a new password. It expires in one hour."
    >
      <AuthForm
        mode="forgot"
        switchLink={
          <>
            Remembered it?{" "}
            <Link href="/login" className="font-semibold">
              Sign in
            </Link>
          </>
        }
      />
    </AuthCard>
  );
}
