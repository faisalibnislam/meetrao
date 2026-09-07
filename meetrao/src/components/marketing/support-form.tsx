"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Icon } from "@/components/ui/icon";
import { buttonClass } from "@/components/ui/button-style";
import { cn } from "@/lib/cn";
import { submitSupportRequest, type SupportState } from "@/lib/actions/support";

const TOPICS = [
  "Something is broken",
  "Google Calendar",
  "My account",
  "A booking went wrong",
  "Something else",
];

const INITIAL: SupportState = { status: "idle" };

export function SupportForm() {
  const [state, action, pending] = useActionState(submitSupportRequest, INITIAL);

  if (state.status === "sent") {
    return (
      <div className="flex flex-col gap-[14px] rounded-[14px] border border-accent-line bg-accent-soft p-[24px]">
        <span className="inline-flex size-[44px] items-center justify-center rounded-full bg-surface">
          <Icon name="circleCheck" weight={900} size={20} className="text-accent" />
        </span>
        <h2 className="m-0 font-serif text-[26px] leading-[1.15] font-normal text-ink">
          Message sent
        </h2>
        <p className="m-0 text-[13.5px] leading-[1.65] text-ink-2 text-pretty">
          Thanks — we have it. We reply to{" "}
          <span className="font-mono">{state.email}</span> within one working
          day, usually sooner.
        </p>
        <div className="flex flex-wrap gap-[10px]">
          <Link href="/help" className={buttonClass({ size: "xl" })}>
            Browse the help centre
          </Link>
          <Link
            href="/support"
            className={buttonClass({ variant: "secondary", size: "xl" })}
          >
            Send another
          </Link>
        </div>
      </div>
    );
  }

  // The discriminated union is worth keeping, so narrow once here rather than
  // widening the type to make every field optional everywhere.
  const errors = state.status === "error" ? state.errors : undefined;
  const values = state.status === "error" ? state.values : undefined;

  return (
    <form
      action={action}
      className="flex flex-col gap-[16px] rounded-[14px] border border-line bg-surface p-[22px]"
    >
      <span className="text-[14px] font-semibold text-ink">
        We&apos;ll reply here
      </span>

      <Field label="Your name" error={errors?.name}>
        <input
          name="name"
          required
          maxLength={120}
          defaultValue={values?.name}
          className="field h-[44px] w-full rounded-[7px] border border-line bg-surface px-[12px] text-[13.5px] text-ink"
        />
      </Field>

      <Field label="Email address" error={errors?.email}>
        <input
          name="email"
          type="email"
          required
          maxLength={200}
          defaultValue={values?.email}
          className="field h-[44px] w-full rounded-[7px] border border-line bg-surface px-[12px] text-[13.5px] text-ink"
        />
      </Field>

      <Field label="What is this about?">
        <select
          name="topic"
          defaultValue={values?.topic ?? TOPICS[0]}
          className="field h-[44px] w-full rounded-[7px] border border-line bg-surface px-[12px] text-[13.5px] text-ink"
        >
          {TOPICS.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </Field>

      <Field
        label="Message"
        error={errors?.message}
        helper="A sentence or two is enough — we just need something to go on."
      >
        <textarea
          name="message"
          required
          rows={5}
          maxLength={4000}
          defaultValue={values?.message}
          className="field w-full rounded-[7px] border border-line bg-surface p-[12px] text-[13.5px] leading-[1.6] text-ink"
        />
      </Field>

      {state.status === "error" && state.formError ? (
        <div className="flex gap-[10px] rounded-[8px] border border-red-line bg-red-soft px-[13px] py-[11px]">
          <Icon
            name="circleExclamation"
            weight={900}
            size={13}
            className="mt-[2px] flex-none text-red"
          />
          <span className="text-[12.5px] leading-[1.55] text-red-ink">
            {state.formError}
          </span>
        </div>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className={cn(
          buttonClass({ size: "3xl" }),
          "h-[44px] disabled:cursor-not-allowed disabled:opacity-60",
        )}
      >
        {pending ? "Sending…" : "Send message"}
      </button>
    </form>
  );
}

function Field({
  label,
  error,
  helper,
  children,
}: {
  label: string;
  error?: string;
  helper?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-[6px]">
      <span className="text-[12.5px] font-semibold text-ink">{label}</span>
      {children}
      {error ? (
        <span className="flex items-center gap-[6px] text-[12px] text-red">
          <Icon name="circleExclamation" weight={900} size={11} />
          {error}
        </span>
      ) : helper ? (
        <span className="text-[12px] leading-[1.5] text-ink-3">{helper}</span>
      ) : null}
    </label>
  );
}
