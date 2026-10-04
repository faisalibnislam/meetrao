"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/controls";
import { Modal } from "@/components/ui/modal";
import { Callout, PanelHeading } from "@/components/ui/panels";
import { UpgradeCallout } from "./upgrade";
import { useToast } from "@/components/ui/toast";
import { addWebhook, createApiKey, removeWebhook, revokeApiKey, testWebhook } from "@/lib/actions/developer";
import { cx } from "@/lib/cx";
import { copyText } from "@/lib/clipboard";

/* ─────────────────────────────────────────────────────────────────────────────
   Keys and endpoints.

   The key is shown once, in a dialog that says so. Everything else about this
   screen follows from that: it cannot be listed, re-read or emailed, and a
   host who loses one makes another.
   ───────────────────────────────────────────────────────────────────────────── */

export type KeyView = { id: string; name: string; prefix: string; createdAt: string; lastUsedAt: string | null };
export type HookView = {
  id: string;
  url: string;
  secret: string;
  lastStatus: number | null;
  lastError: string | null;
  lastAttemptAt: string | null;
};

function when(iso: string | null): string {
  if (!iso) return "never";
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(new Date(iso));
}

export function DeveloperPanel({
  keys,
  hooks,
  siteUrl,
  pro,
}: {
  keys: KeyView[];
  hooks: HookView[];
  siteUrl: string;
  pro: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [busy, startBusy] = useTransition();
  const [dialog, setDialog] = useState<"key" | "hook" | null>(null);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [minted, setMinted] = useState<string | null>(null);

  function run(work: () => Promise<{ error?: string }>, ok: { title: string; text: string }) {
    startBusy(async () => {
      const result = await work();
      if (result.error) {
        toast({ tone: "bad", title: "Could not save", text: result.error });
        return;
      }
      setDialog(null);
      setName("");
      setUrl("");
      toast({ tone: "ok", ...ok });
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-[15px]">
      <PanelHeading
        title="API and webhooks"
        subtitle="Read your bookings from your own tools, and get told when one changes."
      />

      {pro ? null : (
        <UpgradeCallout to="pro" feature="The API">
          A read-only key for your bookings and meetings, and a signed webhook when one changes.
        </UpgradeCallout>
      )}

      <div className="flex flex-col gap-[10px] rounded-[8px] border border-line bg-surface px-[15px] py-[14px]">
        <div className="flex flex-wrap items-center justify-between gap-[10px]">
          <span className="text-[13px] font-semibold text-ink">API keys</span>
          {pro ? (
            <Button variant="secondary" size={28} icon="plus" onClick={() => setDialog("key")}>
              New key
            </Button>
          ) : null}
        </div>

        <span className="text-[12px] leading-[1.5] text-ink-3">
          Read-only: your bookings and your meetings. Nothing an API key can do will create, move or cancel
          anything.
        </span>

        {keys.length ? (
          <div className="flex flex-col">
            {keys.map((k, i) => (
              <div
                key={k.id}
                className={cx("flex flex-wrap items-center gap-[12px] py-[9px]", i > 0 && "border-t border-line-soft")}
              >
                <div className="flex min-w-0 flex-1 flex-col gap-[1px]">
                  <span className="text-[13px] font-semibold text-ink">{k.name}</span>
                  <span className="text-[12px] text-ink-3">
                    {k.prefix}… · made {when(k.createdAt)} · used {when(k.lastUsedAt)}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size={26}
                  busy={busy}
                  className="text-red hover:text-red"
                  onClick={() =>
                    run(() => revokeApiKey(k.id), { title: "Key revoked", text: "It stops working immediately." })
                  }
                >
                  Revoke
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <span className="text-[12.5px] text-ink-2">No keys yet.</span>
        )}
      </div>

      <div className="flex flex-col gap-[10px] rounded-[8px] border border-line bg-surface px-[15px] py-[14px]">
        <div className="flex flex-wrap items-center justify-between gap-[10px]">
          <span className="text-[13px] font-semibold text-ink">Webhook endpoints</span>
          {pro ? (
            <Button variant="secondary" size={28} icon="plus" onClick={() => setDialog("hook")}>
              Add endpoint
            </Button>
          ) : null}
        </div>

        <span className="text-[12px] leading-[1.5] text-ink-3">
          A signed POST on <strong className="font-semibold text-ink-2">booking.created</strong>,{" "}
          <strong className="font-semibold text-ink-2">booking.changed</strong> and{" "}
          <strong className="font-semibold text-ink-2">booking.cancelled</strong>. One attempt each, check the
          signature with the secret below, and fall back to the API if you miss one.
        </span>

        {hooks.length ? (
          <div className="flex flex-col">
            {hooks.map((h, i) => (
              <div key={h.id} className={cx("flex flex-col gap-[6px] py-[10px]", i > 0 && "border-t border-line-soft")}>
                <div className="flex flex-wrap items-center gap-[10px]">
                  <span className="min-w-0 flex-1 text-[13px] break-all text-ink">{h.url}</span>
                  {h.lastStatus === null && h.lastAttemptAt ? (
                    <Badge tone="bad">Failed</Badge>
                  ) : h.lastStatus && h.lastStatus >= 200 && h.lastStatus < 300 ? (
                    <Badge tone="ok">{h.lastStatus}</Badge>
                  ) : h.lastStatus ? (
                    <Badge tone="warn">{h.lastStatus}</Badge>
                  ) : (
                    <Badge tone="off">Untested</Badge>
                  )}
                </div>
                <span className="text-[11.5px] break-all text-ink-3">{h.secret}</span>
                {h.lastError ? <span className="text-[11.5px] text-red">{h.lastError}</span> : null}
                <div className="flex flex-wrap gap-[6px]">
                  <Button
                    variant="ghost"
                    size={26}
                    busy={busy}
                    onClick={() =>
                      run(() => testWebhook(h.id), {
                        title: "Test sent",
                        text: "Reload to see what your endpoint answered.",
                      })
                    }
                  >
                    Send test
                  </Button>
                  <Button
                    variant="ghost"
                    size={26}
                    busy={busy}
                    className="text-red hover:text-red"
                    onClick={() => run(() => removeWebhook(h.id), { title: "Removed", text: "Nothing more is sent there." })}
                  >
                    Remove
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <span className="text-[12.5px] text-ink-2">No endpoints yet.</span>
        )}
      </div>

      <Modal
        open={dialog === "key"}
        onClose={() => setDialog(null)}
        title="New API key"
        subtitle="Shown once. Copy it before you close this."
        primary={{
          label: "Create key",
          busy,
          onClick: () =>
            startBusy(async () => {
              const result = await createApiKey(name);
              if (result.error || !result.key) {
                toast({ tone: "bad", title: "Could not create", text: result.error ?? "Try again." });
                return;
              }
              setMinted(result.key);
              setDialog(null);
              setName("");
              router.refresh();
            }),
        }}
        secondary={{ label: "Cancel", onClick: () => setDialog(null) }}
      >
        <Field label="What is it for?" htmlFor="key-name" help="So you can tell your keys apart later.">
          <Input
            id="key-name"
            height={36}
            value={name}
            placeholder="Zapier"
            onChange={(e) => setName(e.target.value)}
          />
        </Field>
      </Modal>

      <Modal
        open={Boolean(minted)}
        wide
        onClose={() => setMinted(null)}
        title="Your new key"
        subtitle="This is the only time it is shown."
        primary={{
          label: "Copy",
          onClick: () => {
            if (minted) void copyText(minted);
            toast({ tone: "ok", title: "Copied", text: "Store it somewhere safe." });
          },
        }}
        secondary={{ label: "Done", onClick: () => setMinted(null) }}
      >
        <div className="flex flex-col gap-[10px]">
          <textarea
            readOnly
            rows={2}
            value={minted ?? ""}
            aria-label="Your new API key"
            onFocus={(e) => e.currentTarget.select()}
            className="w-full resize-none rounded-[6px] border border-line bg-fill px-[12px] py-[10px] font-sans text-[12.5px] break-all text-ink"
          />
          <Callout tone="amber" title="Not recoverable">
            Meetrao stores a hash of this, not the key. If you lose it, revoke it and make another.
          </Callout>
          <span className="text-[12px] leading-[1.5] text-ink-3">
            Try it: <span className="break-all">curl -H &quot;Authorization: Bearer …&quot; {siteUrl}/api/v1/bookings</span>
          </span>
        </div>
      </Modal>

      <Modal
        open={dialog === "hook"}
        onClose={() => setDialog(null)}
        title="Add an endpoint"
        subtitle="https only, the payload carries a guest's name and address."
        primary={{
          label: "Add",
          busy,
          onClick: () => run(() => addWebhook(url), { title: "Endpoint added", text: "Send a test to check it." }),
        }}
        secondary={{ label: "Cancel", onClick: () => setDialog(null) }}
      >
        <Field label="URL" htmlFor="hook-url">
          <Input
            id="hook-url"
            height={36}
            value={url}
            placeholder="https://example.com/meetrao"
            onChange={(e) => setUrl(e.target.value)}
          />
        </Field>
      </Modal>
    </div>
  );
}
