import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { VerifyActions } from "@/components/auth/verify-actions";
import { VerifyLink } from "@/components/auth/verify-link";
import { Eyebrow } from "@/components/ui/badge";
import { Icon } from "@/components/ui/icon";
import { Logo } from "@/components/ui/logo";
import { Callout } from "@/components/ui/panels";
import { convexServer } from "@/lib/convex/server";
import { api } from "@/convex/_generated/api";

export const metadata: Metadata = { title: "Confirm your email" };

/* The gate between sign-up and onboarding. Enforced server-side: the proxy
   redirect is a convenience, and this page is what an unverified session is
   allowed to see. */
export default async function VerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; code?: string; expired?: string; unverified?: string }>;
}) {
  const { email, code, unverified } = await searchParams;
  let { expired } = await searchParams;

  /* Arriving from the emailed link. The code is spent in the browser, because
     Convex Auth writes the session cookie there — see VerifyLink. */
  const fromLink = Boolean(email && code);
  if (fromLink) expired = undefined; // VerifyLink says so itself, and better

  const convex = await convexServer();
  const who = await convex.query(api.whoami.emailVerified, {});

  // Already confirmed: there is nothing to wait for on this screen.
  if (who.authenticated && who.verified) redirect("/onboarding/1");

  const pending = who.email ?? email ?? "your email address";

  return (
    <div className="box-border flex min-h-screen items-start justify-center p-[20px]">
      <div className="m-auto flex w-full max-w-[470px] flex-col gap-[14px]">
        <Logo height={21} className="self-start" />

        <div className="flex flex-col gap-[20px] rounded-[12px] border border-line bg-surface p-[32px]">
          <span className="inline-flex h-[38px] w-[38px] flex-none items-center justify-center rounded-[10px] bg-accent-soft text-accent">
            <Icon name="envelope" size={16} />
          </span>

          <div className="flex flex-col gap-[9px]">
            <h1 className="m-0 font-serif text-[32px] leading-[1.08] font-normal tracking-[-0.012em] text-ink">
              Confirm your email
            </h1>
            <p className="m-0 text-[14px] leading-[1.6] text-pretty text-ink-2">
              We sent a verification link to <strong className="font-semibold text-ink">{pending}</strong>. Open
              it to activate your account — you can&rsquo;t use Meetrao until you do.
            </p>
          </div>

          {fromLink ? <VerifyLink email={email!} code={code!} /> : null}

          {expired ? (
            <Callout tone="red" title="That link has expired">
              Links last 24 hours. Send yourself a new one below.
            </Callout>
          ) : null}
          {unverified ? (
            <Callout tone="amber" title="Email not verified">
              Confirm your email before signing in.
            </Callout>
          ) : null}

          <div className="flex flex-col gap-[10px] rounded-[8px] border border-line bg-fill px-[15px] py-[14px]">
            <Eyebrow>While you wait</Eyebrow>
            <span className="text-[13px] leading-[1.55] text-ink-2">
              The link expires in 24 hours. If it isn&rsquo;t in your inbox, check your spam folder.
            </span>
          </div>

          <VerifyActions signedIn={who.authenticated} />
        </div>

        <span className="pl-[2px] text-[12.5px] text-ink-3">
          Wrong account? <Link href="/login">Sign in as someone else</Link>.
        </span>
      </div>
    </div>
  );
}
