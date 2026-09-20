import Link from "next/link";
import { convexServes } from "@/lib/backend";
import type { Metadata } from "next";
import { AuthCard } from "@/components/auth/auth-card";
import { AuthForm } from "@/components/auth/auth-form";
import { Callout } from "@/components/ui/panels";

export const metadata: Metadata = {
  title: "Log in",
  description: "Sign in to your Meetrao account.",
  alternates: { canonical: "/login" },
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; sent?: string; error?: string }>;
}) {
  const { next, sent, error } = await searchParams;

  return (
    <AuthCard
      title="Welcome back"
      blurb="Sign in to see your bookings and manage your availability."
      footer={
        <div className="flex items-center gap-[6px] text-[13px] text-ink-2">
          <span>New to Meetrao?</span>
          <Link href="/signup">Create an account</Link>
        </div>
      }
    >
      {sent === "reset" ? (
        <Callout tone="accent">
          If that address has an account, a reset link is on its way. It expires in one hour.
        </Callout>
      ) : null}
      {error === "no-profile" ? (
        <Callout tone="red" title="That account is not set up">
          Sign up again, or contact support if this keeps happening.
        </Callout>
      ) : null}
      <AuthForm mode="login" next={next} convexAuth={convexServes("auth")} />
    </AuthCard>
  );
}
