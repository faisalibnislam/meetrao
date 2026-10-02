"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { buttonClass } from "@/components/ui/button-class";
import { Field, Input, Textarea } from "@/components/ui/controls";
import { Icon } from "@/components/ui/icon";
import { sendSupportMessage } from "@/lib/actions/support";
import { cx } from "@/lib/cx";

const TOPICS: [string, string][] = [
  ["account", "My account"],
  ["calendar", "Calendar or Meet"],
  ["booking", "A booking went wrong"],
  ["billing", "Billing"],
  ["other", "Something else"],
];

const PLACEHOLDERS: Record<string, string> = {
  account: "I cannot sign in even though I confirmed my email…",
  calendar: "My calendar is connected but a booked time was still offered…",
  booking: "A guest booked 3pm Tuesday but it is not on my calendar…",
  billing: "A question about plans or an invoice…",
  other: "Tell us what you were trying to do and what happened instead…",
};

export function SupportForm({
  signedIn,
  accountName,
  accountEmail,
}: {
  signedIn: boolean;
  accountName: string;
  accountEmail: string;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [topic, setTopic] = useState("account");
  const [message, setMessage] = useState("");
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sending, startSend] = useTransition();
  const [sent, setSent] = useState<{ to: string; topic: string; message: string } | null>(null);

  const nameBad = !signedIn && touched && !name.trim();
  const emailBad = !signedIn && touched && !email.includes("@");
  const messageBad = touched && message.trim().length < 10;

  if (sent) {
    return (
      <div className="flex flex-col gap-[18px] rounded-[14px] border border-line bg-surface p-[26px]">
        <div className="flex items-center gap-[12px]">
          <span className="inline-flex h-[32px] w-[32px] flex-none items-center justify-center rounded-full bg-accent text-on-accent">
            <Icon name="check" weight="solid" size={13} />
          </span>
          <h2 className="m-0 font-serif text-[28px] leading-[1.05] font-normal text-ink">Message sent</h2>
        </div>

        <p className="m-0 text-[14px] leading-[1.6] text-ink-2">
          Thanks. We have it. We reply to <strong className="font-semibold text-ink">{sent.to}</strong> within
          one working day, usually sooner.
        </p>

        <div className="flex flex-col gap-[7px] rounded-[10px] border border-line bg-fill px-[15px] py-[14px]">
          <span className="text-[10px] tracking-[0.07em] text-ink-3 uppercase">Your message</span>
          <span className="text-[13px] font-semibold text-ink">
            {TOPICS.find(([k]) => k === sent.topic)?.[1] ?? "Something else"}
          </span>
          <span className="text-[13px] leading-[1.6] whitespace-pre-wrap text-ink-2">{sent.message}</span>
        </div>

        <div className="flex flex-wrap gap-[10px]">
          <Link href="/help" className={cx("unlink no-underline", buttonClass("accent", 38))}>
            Browse the help centre
          </Link>
          <Button
            variant="ghost"
            size={38}
            onClick={() => {
              setSent(null);
              setMessage("");
              setTouched(false);
            }}
          >
            Send another
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-[18px]">
      {error ? (
        <div className="flex gap-[11px] rounded-[8px] border border-red-line bg-red-soft px-[14px] py-[12px]">
          <Icon name="circle-exclamation" weight="solid" size={13} className="mt-[2px] flex-none text-red" />
          <span className="text-[12.5px] leading-[1.55] text-red-ink">{error}</span>
        </div>
      ) : null}

      {signedIn ? (
        <div className="flex flex-wrap items-center gap-[12px] rounded-[10px] border border-line bg-fill px-[14px] py-[12px]">
          <span className="inline-flex h-[34px] w-[34px] flex-none items-center justify-center rounded-[8px] bg-accent-soft text-[12px] font-bold text-accent-ink">
            {accountName
              .split(" ")
              .slice(0, 2)
              .map((w) => w[0] ?? "")
              .join("")
              .toUpperCase()}
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-[1px]">
            <span className="text-[13.5px] font-semibold text-ink">{accountName}</span>
            <span className="text-[12.5px] text-ink-3">{accountEmail}</span>
          </div>
          <span className="flex-none text-[10px] tracking-[0.07em] text-ink-3 uppercase">
            We&rsquo;ll reply here
          </span>
        </div>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-[13px]">
          <Field label="Your name" htmlFor="support-name" error={nameBad ? "Tell us who you are." : undefined}>
            <Input
              id="support-name"
              height={38}
              placeholder="Adam Voigt"
              value={name}
              invalid={nameBad}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
            />
          </Field>
          <Field
            label="Email address"
            htmlFor="support-email"
            error={emailBad ? "We need somewhere to reply." : undefined}
          >
            <Input
              id="support-email"
              type="email"
              height={38}
              placeholder="you@company.com"
              value={email}
              invalid={emailBad}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </Field>
        </div>
      )}

      <div className="flex flex-col gap-[8px]">
        <span className="text-[12.5px] font-semibold text-ink">What is this about?</span>
        <div className="flex flex-wrap gap-[6px]">
          {TOPICS.map(([key, label]) => {
            const on = topic === key;
            return (
              <button
                key={key}
                type="button"
                aria-pressed={on}
                onClick={() => setTopic(key)}
                className={cx(
                  "inline-flex h-[32px] cursor-pointer items-center rounded-[6px] border px-[13px] font-sans text-[13px]",
                  "transition-[background-color,border-color] duration-[120ms]",
                  on
                    ? "border-accent bg-accent font-semibold text-on-accent"
                    : "border-line-strong bg-surface font-medium text-ink hover:bg-fill",
                )}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      <Field
        label={
          <span className="flex items-baseline justify-between gap-[12px]">
            Message
            {message.length > 0 ? (
              <span
                className={cx(
                  "text-[11px] font-normal",
                  message.length > 1800 ? "text-amber" : "text-ink-3",
                )}
              >
                {message.length} characters
              </span>
            ) : null}
          </span>
        }
        htmlFor="support-message"
        error={
          messageBad ? "A sentence or two is enough: we just need something to go on." : undefined
        }
      >
        <Textarea
          id="support-message"
          rows={7}
          placeholder={PLACEHOLDERS[topic]}
          value={message}
          invalid={messageBad}
          onChange={(e) => setMessage(e.target.value)}
        />
      </Field>

      <div className="flex flex-wrap items-center gap-[14px]">
        <Button
          variant="accent"
          size={40}
          busy={sending}
          onClick={() =>
            startSend(async () => {
              setError(null);
              const invalid =
                (!signedIn && (!name.trim() || !email.includes("@"))) || message.trim().length < 10;
              if (invalid) {
                setTouched(true);
                return;
              }

              const result = await sendSupportMessage({ name, email, topic, message });
              if (result.error) {
                setError(result.error);
                return;
              }
              setSent({ to: result.sentTo ?? email, topic, message });
            })
          }
        >
          {sending ? "Sending…" : "Send message"}
        </Button>
        <span className="text-[12.5px] text-ink-3">
          {signedIn
            ? "Sent from your account, so we already know who you are."
            : "We only use your email to reply to this message."}
        </span>
      </div>
    </div>
  );
}
