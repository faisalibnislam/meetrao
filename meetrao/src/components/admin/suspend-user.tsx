"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { setUserSuspended } from "@/lib/actions/admin";

/** Suspend / Reactivate, with the confirm dialog the design specifies. */
export function SuspendUserButton({
  userId,
  name,
  suspended,
}: {
  userId: string;
  name: string;
  suspended: boolean;
}) {
  const { notify } = useToast();
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  function run(next: boolean) {
    startTransition(async () => {
      const result = await setUserSuspended(userId, next);
      if (!result.ok) {
        notify("bad", "Could not update", result.message ?? "Try again.");
        return;
      }
      setConfirming(false);
      if (next) {
        notify(
          "bad",
          "Account suspended",
          `${name} can no longer accept bookings.`,
        );
      } else {
        notify(
          "ok",
          "Account reactivated",
          `${name} can accept bookings again.`,
        );
      }
    });
  }

  return (
    <>
      {suspended ? (
        <Button
          variant="secondary"
          size="base"
          loading={pending}
          onClick={() => run(false)}
        >
          Reactivate
        </Button>
      ) : (
        <Button variant="danger" size="base" onClick={() => setConfirming(true)}>
          Suspend user
        </Button>
      )}

      <Modal
        open={confirming}
        onClose={() => setConfirming(false)}
        title="Suspend this account?"
        primaryLabel="Suspend user"
        primaryVariant="danger"
        onPrimary={() => run(true)}
        primaryLoading={pending}
        secondaryLabel="Keep active"
        onSecondary={() => setConfirming(false)}
      >
        <span className="text-[13.5px] leading-[1.55] text-pretty text-ink-2">
          Suspending {name} blocks sign-in and stops new bookings. Existing
          bookings stay on their calendar.
        </span>
      </Modal>
    </>
  );
}
