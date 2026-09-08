"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { signOut } from "@/lib/actions/auth";

export function SignOutButton({ label = "Log out" }: { label?: string }) {
  const [pending, start] = useTransition();

  return (
    <Button variant="secondary" size={38} icon="sign-out" busy={pending} onClick={() => start(() => signOut())}>
      {label}
    </Button>
  );
}
