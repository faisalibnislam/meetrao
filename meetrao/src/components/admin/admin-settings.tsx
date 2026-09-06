"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { savePlatformSettings, saveAdminProfile } from "@/lib/actions/admin-settings";

export function AdminSettingsForm({
  platform,
  account,
}: {
  platform: { appName: string; supportEmail: string };
  account: { fullName: string; email: string };
}) {
  const { notify } = useToast();
  const [values, setValues] = useState({ ...platform, ...account });
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  const set = (key: keyof typeof values, value: string) => {
    setValues((v) => ({ ...v, [key]: value }));
    setSaved(false);
  };

  function save() {
    startTransition(async () => {
      const platformResult = await savePlatformSettings({
        appName: values.appName,
        supportEmail: values.supportEmail,
      });
      if (!platformResult.ok) {
        notify("bad", "Could not save", platformResult.message ?? "Try again.");
        return;
      }

      const accountResult = await saveAdminProfile({
        fullName: values.fullName,
        email: values.email,
      });
      if (!accountResult.ok) {
        notify("bad", "Could not save", accountResult.message ?? "Try again.");
        return;
      }

      setSaved(true);
      notify("ok", "Settings saved", "Your changes are live.");
    });
  }

  return (
    <div className="mx-auto flex w-full max-w-[560px] flex-col gap-[20px]">
      <section className="flex flex-col gap-[14px] border-b border-line pb-[20px]">
        <div className="flex flex-col gap-[2px]">
          <h2 className="m-0 text-[14.5px] font-semibold text-ink">Platform</h2>
          <p className="m-0 text-[12.5px] text-ink-3">
            Shown to every user of this workspace.
          </p>
        </div>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(196px,1fr))] gap-[13px]">
          <Field label="App name">
            <Input
              fieldSize="sm"
              value={values.appName}
              onChange={(e) => set("appName", e.target.value)}
            />
          </Field>
          <Field label="Support email">
            <Input
              fieldSize="sm"
              type="email"
              value={values.supportEmail}
              onChange={(e) => set("supportEmail", e.target.value)}
            />
          </Field>
        </div>
      </section>

      <section className="flex flex-col gap-[14px]">
        <div className="flex flex-col gap-[2px]">
          <h2 className="m-0 text-[14.5px] font-semibold text-ink">
            Admin account
          </h2>
          <p className="m-0 text-[12.5px] text-ink-3">
            Your own sign-in details.
          </p>
        </div>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(196px,1fr))] gap-[13px]">
          <Field label="Name">
            <Input
              fieldSize="sm"
              value={values.fullName}
              onChange={(e) => set("fullName", e.target.value)}
            />
          </Field>
          <Field label="Email">
            <Input
              fieldSize="sm"
              type="email"
              value={values.email}
              onChange={(e) => set("email", e.target.value)}
            />
          </Field>
        </div>

        <div className="flex flex-wrap gap-[10px]">
          <Button size="lg" loading={pending} onClick={save}>
            {saved ? "Saved" : "Save changes"}
          </Button>
          <form action="/auth/signout" method="post">
            <Button type="submit" variant="ghost" size="lg">
              Log out
            </Button>
          </form>
        </div>
      </section>
    </div>
  );
}
