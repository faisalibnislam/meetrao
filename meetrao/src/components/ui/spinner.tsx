import { cx } from "@/lib/cx";

/** 700ms linear infinite — the design's one loading affordance. */
export function Spinner({
  size = 12,
  tone = "ink",
  className,
}: {
  size?: number;
  /** onFill = sits on an accent/red button · ink = sits on a light surface */
  tone?: "onFill" | "ink" | "accent";
  className?: string;
}) {
  const ring =
    tone === "onFill"
      ? { borderColor: "rgba(255,255,255,0.35)", borderTopColor: "#fff" }
      : tone === "accent"
        ? { borderColor: "var(--line-strong)", borderTopColor: "var(--accent)" }
        : { borderColor: "rgba(26,25,23,0.18)", borderTopColor: "var(--ink)" };

  return (
    <span
      aria-hidden="true"
      className={cx("animate-spin-slow rounded-full", className)}
      style={{
        width: size,
        height: size,
        borderWidth: 2,
        borderStyle: "solid",
        flex: "none",
        ...ring,
      }}
    />
  );
}
