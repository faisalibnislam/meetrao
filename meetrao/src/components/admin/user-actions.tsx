"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { removeAccount, setSuspended } from "@/lib/actions/admin";

/* Suspend blocks sign-in and stops new bookings, and is reversible.
   Remove is not. They stay two separate buttons with two separate dialogs. */

export function SuspendButton({
  userId,
  name,
  suspended,
}: {
  userId: string;
  name: string;
  suspended: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [busy, startAction] = useTransition();

  const apply = (next: boolean) =>
    startAction(async () => {
      const result = await setSuspended(userId, next);
      if (result.error) {
        toast({ tone: "bad", title: "Could not change that", text: result.error });
        return;
      }
      setOpen(false);
      toast(
        next
          ? { tone: "bad", title: "Account suspended", text: `${name} can no longer accept bookings.` }
          : { tone: "ok", title: "Account reactivated", text: `${name} can accept bookings again.` },
      );
      router.refresh();
    });

  return (
    <>
      <Button
        variant={suspended ? "secondary" : "danger"}
        size={32}
        className="flex-none"
        busy={busy && suspended}
        onClick={() => (suspended ? apply(false) : setOpen(true))}
      >
        {suspended ? "Reactivate" : "Suspend user"}
      </Button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Suspend this account?"
        primary={{
          label: busy ? "Suspending…" : "Suspend user",
          variant: "danger",
          busy,
          onClick: () => apply(true),
        }}
        secondary={{ label: "Keep active", onClick: () => setOpen(false) }}
      >
        <span className="text-[13.5px] leading-[1.55] text-pretty text-ink-2">
          Suspending {name} blocks sign-in and stops new bookings. Existing bookings stay on their calendar.
        </span>
      </Modal>
    </>
  );
}

export function RemoveAccountPanel({ userId, name }: { userId: string; name: string }) {
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [busy, startAction] = useTransition();

  const first = name.split(" ")[0] || name;

  return (
    <>
      <div className="flex flex-wrap items-center gap-[14px] rounded-[8px] border border-red-line bg-red-soft px-[14px] py-[13px]">
        <div className="flex min-w-[220px] flex-1 flex-col gap-[2px]">
          <span className="text-[13.5px] font-semibold text-red">Remove this account</span>
          <span className="text-[12.5px] leading-[1.45] text-red-ink">
            Deletes {name} and everything they own. They would have to sign up again from scratch.
          </span>
        </div>
        <Button variant="danger" size={30} className="flex-none" onClick={() => setOpen(true)}>
          Remove account
        </Button>
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Remove this account?"
        primary={{
          label: busy ? "Removing…" : "Remove account",
          variant: "danger",
          busy,
          onClick: () =>
            startAction(async () => {
              const result = await removeAccount(userId);
              if (result.error) {
                toast({ tone: "bad", title: "Could not remove", text: result.error });
                return;
              }
              toast({ tone: "bad", title: "Account removed", text: `${name} and all their data are gone.` });
              router.push("/admin/users");
              router.refresh();
            }),
        }}
        secondary={{ label: "Keep account", onClick: () => setOpen(false) }}
      >
        <span className="text-[13.5px] leading-[1.55] text-pretty text-ink-2">
          This permanently deletes {name} — their profile, booking link, meetings, availability and booking
          history. Upcoming meetings are cancelled and their guests notified. {first} would have to sign up again
          from scratch. This cannot be undone.
        </span>
      </Modal>
    </>
  );
}
