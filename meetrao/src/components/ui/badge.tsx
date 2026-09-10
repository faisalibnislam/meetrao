import type { ReactNode } from "react";
import { cx } from "@/lib/cx";

export type Tone = "ok" | "bad" | "warn" | "off";

const TONE: Record<Tone, string> = {
  ok: "border-accent-line bg-accent-soft text-accent",
  bad: "border-red-line bg-red-soft text-red",
  warn: "border-amber-line bg-amber-soft text-amber",
  off: "border-line bg-fill text-ink-2",
};

const DOT: Record<Tone, string> = {
  ok: "bg-accent",
  bad: "bg-red",
  warn: "bg-amber",
  off: "bg-ink-3",
};

/** 20px pill, 11.5/600, 5px status dot. Status colours never decorate. */
export function Badge({ tone = "off", dot = true, children }: { tone?: Tone; dot?: boolean; children: ReactNode }) {
  return (
    <span
      className={cx(
        "inline-flex h-[20px] flex-none items-center gap-[6px] whitespace-nowrap rounded-[4px] border px-[8px] text-[11.5px] font-semibold",
        TONE[tone],
      )}
    >
      {dot ? <span aria-hidden="true" className={cx("h-[5px] w-[5px] flex-none rounded-full", DOT[tone])} /> : null}
      {children}
    </span>
  );
}

/** Uppercase micro-label. 10–10.5px, 0.07–0.08em tracking. */
export function Eyebrow({
  children,
  size = 10,
  className,
  id,
}: {
  children: ReactNode;
  size?: 10 | 10.5;
  className?: string;
  id?: string;
}) {
  return (
    <span
      id={id}
      className={cx(
        "uppercase text-ink-3",
        size === 10 ? "text-[10px] tracking-[0.07em]" : "text-[10.5px] tracking-[0.08em]",
        className,
      )}
    >
      {children}
    </span>
  );
}

/** Initials chip. The design uses 24/26/28/32/38/42px squares. */
export function Avatar({
  name,
  size = 38,
  tone = "accent",
  src,
}: {
  name: string;
  size?: 24 | 26 | 28 | 32 | 38 | 42;
  tone?: "accent" | "neutral";
  /** The host's photograph. Initials are the fallback, not a lesser option. */
  src?: string | null;
}) {
  const initials = name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0] ?? "")
    .join("")
    .toUpperCase();

  const radius = size <= 26 ? 5 : size <= 32 ? 8 : 8;
  const fontSize = size <= 24 ? 10.5 : size <= 28 ? 10.5 : size <= 32 ? 12 : size <= 38 ? 13 : 14;

  if (src) {
    return (
      // Plain <img>, not next/image: the source is a Supabase Storage URL that
      // changes whenever the host re-crops, and these are 24-42px — there is
      // nothing for the optimiser to save.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt=""
        aria-hidden="true"
        width={size}
        height={size}
        className="flex-none object-cover"
        style={{ width: size, height: size, borderRadius: radius }}
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      className={cx(
        "inline-flex flex-none items-center justify-center font-bold",
        tone === "accent" ? "bg-accent-soft text-accent" : "bg-fill-2 text-ink-2",
      )}
      style={{ width: size, height: size, borderRadius: radius, fontSize }}
    >
      {initials}
    </span>
  );
}
