"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/controls";
import { PanelHeading } from "@/components/ui/panels";
import { useToast } from "@/components/ui/toast";
import { savePlatformSettings, saveAdminAccount } from "@/lib/actions/admin";

export function AdminSettingsForm({
  appName: initialAppName,
  supportEmail: initialSupportEmail,
  adminName: initialAdminName,
  adminEmail,
  onSignOut,
}: {
  appName: string;
  supportEmail: string;
  adminName: string;
  adminEmail: string;
  onSignOut: () => void | Promise<void>;
}) {
  const toast = useToast();
  const [appName, setAppName] = useState(initialAppName);
  const [supportEmail, setSupportEmail] = useState(initialSupportEmail);
  const [adminName, setAdminName] = useState(initialAdminName);
  const [saving, startSave] = useTransition();
  const [saved, setSaved] = useState(false);

  return (
    <div className="mx-auto flex w-full max-w-[560px] flex-col gap-[20px]">
      <section className="flex flex-col gap-[14px] border-b border-line pb-[20px]">
        <PanelHeading title="Platform" subtitle="Shown to every user of this workspace." />

        <div className="grid grid-cols-[repeat(auto-fit,minmax(196px,1fr))] gap-[13px]">
          <Field label="App name" htmlFor="app-name">
            <Input
              id="app-name"
              value={appName}
              onChange={(e) => {
                setAppName(e.target.value);
                setSaved(false);
              }}
            />
          </Field>
          <Field label="Support email" htmlFor="support-email">
            <Input
              id="support-email"
              type="email"
              value={supportEmail}
              onChange={(e) => {
                setSupportEmail(e.target.value);
                setSaved(false);
              }}
            />
          </Field>
        </div>
      </section>

      <section className="flex flex-col gap-[14px]">
        <PanelHeading title="Admin account" subtitle="Your own sign-in details." />

        <div className="grid grid-cols-[repeat(auto-fit,minmax(196px,1fr))] gap-[13px]">
          <Field label="Name" htmlFor="admin-name">
            <Input
              id="admin-name"
              value={adminName}
              onChange={(e) => {
                setAdminName(e.target.value);
                setSaved(false);
              }}
            />
          </Field>
          <Field label="Email" htmlFor="admin-email" help="Change this from your own account settings.">
            <Input id="admin-email" type="email" value={adminEmail} readOnly disabled />
          </Field>
        </div>

        <div className="flex flex-wrap gap-[10px]">
          <Button
            variant="accent"
            size={34}
            busy={saving}
            onClick={() =>
              startSave(async () => {
                const platform = await savePlatformSettings({ appName, supportEmail });
                if (platform.error) {
                  toast({ tone: "bad", title: "Could not save", text: platform.error });
                  return;
                }
                const account = await saveAdminAccount({ fullName: adminName });
                if (account.error) {
                  toast({ tone: "bad", title: "Could not save", text: account.error });
                  return;
                }
                setSaved(true);
                toast({ tone: "ok", title: "Settings saved", text: "Your changes are live." });
              })
            }
          >
            {saving ? "Saving…" : saved ? "Saved" : "Save changes"}
          </Button>
          <Button variant="ghost" size={34} onClick={onSignOut}>
            Log out
          </Button>
        </div>
      </section>
    </div>
  );
}
