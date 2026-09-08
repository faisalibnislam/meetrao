import Link from "next/link";
import type { Metadata } from "next";
import { AuthCard } from "@/components/auth/auth-card";
import { AuthForm } from "@/components/auth/auth-form";

export const metadata: Metadata = { title: "Create your account" };

export default function SignupPage() {
  return (
    <AuthCard
      title="Create your account"
      blurb="Set up your booking link in about two minutes."
      footer={
        <>
          <span className="text-[12.5px] leading-[1.55] text-pretty text-ink-3">
            By creating an account you agree to our <Link href="/terms">Terms of Service</Link> and{" "}
            <Link href="/privacy">Privacy Policy</Link>.
          </span>
          <div className="flex items-center gap-[6px] text-[13px] text-ink-2">
            <span>Already have an account?</span>
            <Link href="/login">Sign in</Link>
          </div>
        </>
      }
    >
      <AuthForm mode="signup" />
    </AuthCard>
  );
}
