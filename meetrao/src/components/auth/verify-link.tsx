"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthActions } from "@convex-dev/auth/react";
import { Callout } from "@/components/ui/panels";

/* ─────────────────────────────────────────────────────────────────────────────
   Spending the code the emailed link carried.

   Convex Auth verifies with a CODE, not a link — there is no endpoint to click
   and nothing happens server-side when the recipient opens their mail. So the
   link points here with `?email=&code=`, and this submits them.

   That keeps the promise the rest of the screen makes ("open the link to
   activate your account") true, which is what the Supabase version did by a
   different mechanism. The alternative was showing a code and asking people to
   copy it into a box, which is a worse first five minutes.

   Runs once. `useEffect` in React 19 Strict Mode fires twice in development,
   and the code is single-use — the second attempt would fail and overwrite a
   successful verification with "that link has expired". The ref guards it.
   ───────────────────────────────────────────────────────────────────────────── */
export function VerifyLink({ email, code }: { email: string; code: string }) {
  const { signIn } = useAuthActions();
  const router = useRouter();
  const [failed, setFailed] = useState(false);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    void (async () => {
      try {
        await signIn("password", { email, code, flow: "email-verification" });
        router.replace("/onboarding/1");
        router.refresh();
      } catch {
        // Expired, already spent, or simply wrong — all the same to the person
        // holding it, and all fixed by asking for another.
        setFailed(true);
      }
    })();
  }, [signIn, router, email, code]);

  if (failed) {
    return (
      <Callout tone="red" title="That link has expired">
        Links last 24 hours and work once. Send yourself a new one below.
      </Callout>
    );
  }

  return (
    <Callout tone="amber" title="Confirming your email">
      One moment — we are checking the link you opened.
    </Callout>
  );
}
