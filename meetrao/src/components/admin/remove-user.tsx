"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { removeUserAccount } from "@/lib/actions/admin";

/**
 * Account removal, deliberately built to look nothing like suspension.
 *
 * Suspension is a button in the header row and can be undone from the same
 * button. This is a red-soft panel of its own, further down, with a dialog that
 * spells out the consequence — because the two are one click apart in the UI
 * and one of them cannot be taken back.
 */
export function RemoveUserPanel({
  userId,
  name,
  email,
  username,
}: {
  userId: string;
  name: string;
  email: string;
  username: string;
}) {
  const router = useRouter();
  const { notify } = useToast();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function remove() {
    startTransition(async () => {
      const result = await removeUserAccount(userId);
      if (!result.ok) {
        notify("bad", "Could not remove", result.message ?? "Try again.");
        return;
      }
      setOpen(false);
      notify("ok", "Account removed", `${email} and everything they owned.`);
      router.push("/admin/users");
    });
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-[14px] rounded-[8px] border border-red-line bg-red-soft px-[15px] py-[13px]">
        <div className="flex min-w-[220px] flex-1 flex-col gap-[3px]">
          <span className="text-[13.5px] font-semibold text-red">
            Remove this account
          </span>
          <span className="text-[12.5px] leading-[1.55] text-red-ink text-pretty">
            Deletes {name} and everything they own. They would have to sign up
            again from scratch.
          </span>
        </div>
        <Button variant="danger" size="lg" onClick={() => setOpen(true)}>
          Remove account
        </Button>
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        width={460}
        title="Remove this account?"
        subtitle={email}
        primaryLabel={pending ? "Removing…" : "Remove account"}
        primaryVariant="danger"
        primaryLoading={pending}
        onPrimary={remove}
        secondaryLabel="Keep it"
        onSecondary={() => setOpen(false)}
      >
        <div className="flex flex-col gap-[11px]">
          <p className="m-0 text-[13px] leading-[1.6] text-ink-2 text-pretty">
            This cannot be undone. It deletes immediately and there is no export
            first.
          </p>

          <ul className="m-0 flex list-none flex-col gap-[7px] p-0">
            {[
              "Their meetings, availability and every booking, past and upcoming.",
              "Their stored Google Calendar token, so Meetrao loses all access.",
              `Their booking page at /${username}, which stops working.`,
            ].map((line) => (
              <li key={line} className="flex items-start gap-[9px]">
                <Icon
                  name="circleXmark"
                  weight={900}
                  size={11}
                  className="mt-[4px] flex-none text-red"
                />
                <span className="text-[12.5px] leading-[1.55] text-ink-2">
                  {line}
                </span>
              </li>
            ))}
          </ul>

          <div className="rounded-[8px] border border-line bg-fill px-[13px] py-[11px]">
            <span className="text-[12.5px] leading-[1.55] text-ink-2 text-pretty">
              <strong className="font-semibold text-ink">
                /{username} stays reserved.
              </strong>{" "}
              Nobody else can claim it — a booking link that has been shared
              should not start pointing at a different person.
            </span>
          </div>

          <div className="rounded-[8px] border border-amber-line bg-amber-soft px-[13px] py-[11px]">
            <span className="text-[12.5px] leading-[1.55] text-amber-ink text-pretty">
              Looking to block sign-in temporarily? Suspend the account instead
              — that is reversible.
            </span>
          </div>
        </div>
      </Modal>
    </>
  );
}
