import type { Metadata } from "next";
import Link from "next/link";
import { AuthCard } from "@/components/auth/auth-card";
import { AuthForm } from "@/components/auth/auth-form";

export const metadata: Metadata = { title: "Sign up" };

export default function SignupPage() {
  return (
    <AuthCard
      title="Create your account"
      blurb="Set up your booking link in about two minutes."
      footer={
        <>
          <span>Already have an account?</span>
          <Link href="/login">Sign in</Link>
        </>
      }
    >
      <AuthForm mode="signup" />
    </AuthCard>
  );
}
