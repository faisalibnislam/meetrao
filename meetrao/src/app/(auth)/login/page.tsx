import type { Metadata } from "next";
import Link from "next/link";
import { AuthCard } from "@/components/auth/auth-card";
import { AuthForm } from "@/components/auth/auth-form";

export const metadata: Metadata = { title: "Log in" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  return (
    <AuthCard
      title="Welcome back"
      blurb="Sign in to see your bookings and manage your availability."
      footer={
        <>
          <span>New to Meetrao?</span>
          <Link href="/signup">Create an account</Link>
        </>
      }
    >
      <AuthForm mode="login" next={next} />
    </AuthCard>
  );
}
