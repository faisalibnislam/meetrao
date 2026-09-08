import type { ReactNode } from "react";

/* One white card, max 580px, on the onboarding rail. Title, blurb, the step's
   own content, then a divider with 20px of space above the action row. */
export function OnboardingCard({
  title,
  blurb,
  children,
  actions,
}: {
  title: string;
  blurb: string;
  children: ReactNode;
  actions: ReactNode;
}) {
  return (
    <div className="flex flex-1 items-start justify-center overflow-auto p-[20px]">
      <div className="m-auto flex w-full max-w-[580px] flex-col gap-[24px] rounded-[12px] border border-line bg-surface p-[34px] max-[820px]:p-[24px]">
        <div className="flex flex-col gap-[8px]">
          <h1 className="m-0 font-serif text-[32px] leading-[1.1] font-normal tracking-[-0.01em] text-ink">
            {title}
          </h1>
          <p className="m-0 max-w-[48ch] text-[14px] leading-[1.55] text-pretty text-ink-2">{blurb}</p>
        </div>

        {children}

        <div className="flex flex-wrap items-center gap-[10px] border-t border-line-soft pt-[20px]">{actions}</div>
      </div>
    </div>
  );
}
