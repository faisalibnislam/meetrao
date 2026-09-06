import { cn } from "@/lib/cn";
import { Logo } from "@/components/brand/logo";
import { Icon } from "@/components/ui/icon";

export const ONBOARDING_STEPS = [
  "Welcome",
  "Calendar",
  "Meeting",
  "Hours",
  "Ready",
] as const;

export const TOTAL_STEPS = ONBOARDING_STEPS.length;

/**
 * The fixed top rail: logo, "Step N / 5", and five nodes joined by 2px
 * connectors that fill green up to the current step. Only the current node
 * spells out its name, and on mobile even that is hidden.
 */
export function StepRail({ step }: { step: number }) {
  return (
    <div className="flex items-center justify-between gap-[16px] border-b border-line px-[22px] py-[13px]">
      <Logo height={21} />

      <div className="flex min-w-0 items-center gap-[14px]">
        <span className="font-mono text-[10.5px] tracking-[0.08em] whitespace-nowrap uppercase text-ink-3">
          Step {step} / {TOTAL_STEPS}
        </span>

        <ol className="flex min-w-0 list-none items-center gap-0 p-0">
          {ONBOARDING_STEPS.map((label, index) => {
            const n = index + 1;
            const done = n < step;
            const current = n === step;

            return (
              <li
                key={label}
                aria-current={current ? "step" : undefined}
                className={cn(
                  "flex flex-none items-center",
                  current ? "gap-[8px]" : "gap-0",
                )}
              >
                {n > 1 ? (
                  <span
                    aria-hidden="true"
                    className={cn(
                      "h-[2px] w-[10px] flex-none md:w-[18px]",
                      done || current ? "bg-accent" : "bg-line-strong",
                    )}
                  />
                ) : null}

                <span
                  className={cn(
                    "box-border inline-flex flex-none items-center justify-center rounded-full font-semibold",
                    "transition-all duration-[160ms]",
                    current
                      ? "size-[22px] border border-accent bg-accent text-[11px] text-white shadow-[0_0_0_3px_var(--accent-soft)]"
                      : done
                        ? "size-[18px] border border-accent bg-accent text-white"
                        : "size-[18px] border border-line-strong bg-surface text-[10px] text-ink-3",
                  )}
                >
                  {done ? (
                    <Icon name="check" weight={900} size={8} />
                  ) : (
                    n
                  )}
                </span>

                {current ? (
                  <span className="hidden text-[12.5px] font-semibold whitespace-nowrap text-ink md:inline">
                    {label}
                  </span>
                ) : null}
                <span className="sr-only">{current ? "" : label}</span>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}

/** The white card every step's content sits in. */
export function StepCard({
  title,
  blurb,
  children,
  actions,
}: {
  title: string;
  blurb: string;
  children?: React.ReactNode;
  actions: React.ReactNode;
}) {
  return (
    <div className="flex flex-1 items-start justify-center overflow-auto p-[20px]">
      <div className="m-auto flex w-full max-w-[580px] flex-col gap-[24px] rounded-[12px] border border-line bg-surface p-[34px]">
        <div className="flex flex-col gap-[8px]">
          <h1 className="m-0 font-serif text-[32px] leading-[1.1] font-normal tracking-[-0.01em] text-ink">
            {title}
          </h1>
          <p className="m-0 max-w-[48ch] text-[14px] leading-[1.55] text-pretty text-ink-2">
            {blurb}
          </p>
        </div>

        {children}

        <div className="flex flex-wrap items-center gap-[10px] border-t border-line-soft pt-[20px]">
          {actions}
        </div>
      </div>
    </div>
  );
}
