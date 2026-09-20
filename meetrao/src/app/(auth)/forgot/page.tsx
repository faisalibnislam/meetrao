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
      footer={
        <div className="flex items-center gap-[6px] text-[13px] text-ink-2">
          <span>Remembered it?</span>
          <Link href="/login">Sign in</Link>
        </div>
      }
    >
      <AuthForm mode="forgot" />
    </AuthCard>
  );
}
