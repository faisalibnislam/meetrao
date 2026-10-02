"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/badge";
import { Icon, type IconName } from "@/components/ui/icon";
import { OnboardingCard } from "./onboarding-card";
import { useToast } from "@/components/ui/toast";
import { checkUsername, claimUsername } from "@/lib/actions/onboarding";
import { cx } from "@/lib/cx";
import {
  isBadStatus,
  sanitizeUsername,
  usernameNote,
  usernameStatus,
  type UsernameStatus,
} from "@/lib/username";

const RULES: { icon: IconName; text: string }[] = [
  { icon: "hashtag", text: "Letters, numbers and hyphens. Between 3 and 30 characters." },
  { icon: "link", text: "This is the link you share, so short and recognisable beats clever." },
  { icon: "gear", text: "You can change it later in Settings, but the old link stops working." },
];

/** Debounced so it reads like a real lookup instead of firing on every keystroke. */
const DEBOUNCE_MS = 620;

export function StepClaimLink({ initial }: { initial: string }) {
  const router = useRouter();
  const toast = useToast();
  const [value, setValue] = useState(initial === "" ? "" : "");
  const [status, setStatus] = useState<UsernameStatus>("empty");
  const [ideas, setIdeas] = useState<string[]>([]);
  const [saving, startSave] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const latest = useRef(0);

  useEffect(() => () => clearTimeout(timer.current), []);

  function run(next: string) {
    const clean = sanitizeUsername(next);
    setValue(clean);
    setIdeas([]);

    const syntax = usernameStatus(clean);
    setStatus(syntax);
    clearTimeout(timer.current);
    if (syntax !== "checking") return;

    const ticket = ++latest.current;
    timer.current = setTimeout(async () => {
      const result = await checkUsername(clean);
      // A slower earlier lookup must never overwrite a newer answer.
      if (ticket !== latest.current) return;
      setStatus(result.status);
      setIdeas(result.ideas);
    }, DEBOUNCE_MS);
  }

  const bad = isBadStatus(status);
  const ok = status === "ok";
  const note = usernameNote(status, value, ideas.length > 0) || "Pick a name to check whether it is free.";

  return (
    <OnboardingCard
      title="Claim your link"
      blurb="Pick the address people will use to book you. Everything after this takes about two minutes, and you can change any of it later."
      actions={
        <Button
          variant="accent"
          size={38}
          disabled={!ok || saving}
          busy={saving}
          aria-describedby="claim-status"
          onClick={() =>
            startSave(async () => {
              const result = await claimUsername(value);
              if (result.error) {
                setStatus("taken");
                toast({ tone: "bad", title: "Could not claim that link", text: result.error });
                return;
              }
              toast({ tone: "ok", title: "Link claimed", text: `meetrao.com/${value} is yours.` });
              router.push("/onboarding/2");
            })
          }
        >
          Claim this link
        </Button>
      }
    >
      <div className="flex flex-col gap-[15px]">
        <div className="flex flex-col gap-[7px]">
          <label htmlFor="claim-link" className="text-[12.5px] font-semibold text-ink">
            Your booking link
          </label>

          <div
            className={cx(
              "box-border flex h-[42px] w-full items-center rounded-[7px] border bg-surface transition-[border-color] duration-[140ms]",
              ok ? "border-accent" : bad ? "border-red" : "border-line-strong",
            )}
          >
            <span aria-hidden="true" className="flex-none pl-[12px] text-[13.5px] text-ink-3">
              meetrao.com/
            </span>
            <input
              id="claim-link"
              type="text"
              value={value}
              onChange={(e) => run(e.target.value)}
              placeholder="yourname"
              autoFocus
              spellCheck={false}
              autoComplete="off"
              aria-describedby="claim-status claim-rules"
              aria-invalid={bad}
              className="h-full min-w-0 flex-1 border-0 bg-transparent py-0 pr-[12px] pl-[1px] text-[13.5px] font-medium text-ink outline-none"
            />
            {status === "checking" ? (
              <span
                aria-hidden="true"
                className="animate-spin-slow mr-[12px] h-[13px] w-[13px] flex-none rounded-full border-2 border-line-strong border-t-accent"
              />
            ) : null}
            {ok || status === "taken" ? (
              <Icon
                name={ok ? "check" : "xmark"}
                weight="solid"
                size={12}
                className={cx("mr-[12px] flex-none", ok ? "text-accent-ink" : "text-red")}
              />
            ) : null}
          </div>

          <span
            id="claim-status"
            role="status"
            aria-live="polite"
            className={cx(
              "block min-h-[19px] text-[12.5px] leading-[1.5]",
              ok ? "text-accent-ink" : bad ? "text-red" : "text-ink-3",
            )}
          >
            {note}
          </span>
        </div>

        {status === "taken" && ideas.length > 0 ? (
          <div className="flex flex-col gap-[8px]">
            <Eyebrow id="claim-ideas-label">These are free</Eyebrow>
            <div role="group" aria-labelledby="claim-ideas-label" className="flex flex-wrap gap-[7px]">
              {ideas.map((idea) => (
                <button
                  key={idea}
                  type="button"
                  onClick={() => run(idea)}
                  className="inline-flex h-[31px] cursor-pointer items-center gap-[8px] rounded-[6px] border border-accent-line bg-accent-soft px-[11px] text-[12.5px] text-accent-ink transition-colors duration-[120ms] hover:bg-[var(--accent-soft-hover)]"
                >
                  <Icon name="plus" size={9} />
                  {idea}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <div
          id="claim-rules"
          className="flex flex-col gap-[9px] rounded-[8px] border border-line bg-fill px-[15px] py-[14px]"
        >
          <Eyebrow>Worth knowing</Eyebrow>
          {RULES.map((rule) => (
            <div key={rule.text} className="flex items-start gap-[10px]">
              <Icon name={rule.icon} size={11} className="mt-[2px] w-[14px] flex-none text-ink-3" />
              <span className="text-[13px] leading-[1.5] text-pretty text-ink-2">{rule.text}</span>
            </div>
          ))}
        </div>
      </div>
    </OnboardingCard>
  );
}
