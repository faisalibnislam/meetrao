/**
 * Section eyebrow: an 18x2px accent rule plus 10.5px mono caps at 0.14em.
 * 10.5px is above the 10px text floor deliberately — this is the smallest text
 * on the page and the floor has been breached here before.
 */
export function Eyebrow({
  children,
  tone = "accent",
}: {
  children: React.ReactNode;
  tone?: "accent" | "mint";
}) {
  const color = tone === "mint" ? "#7FD8C4" : "var(--accent)";
  return (
    <span
      className="inline-flex items-center gap-[10px] font-mono text-[10.5px] font-medium tracking-[0.14em] uppercase"
      style={{ color }}
    >
      <span
        className="h-[2px] w-[18px] flex-none rounded-[1px]"
        style={{ background: color }}
      />
      {children}
    </span>
  );
}
