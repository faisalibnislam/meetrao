import type { ComponentProps, ReactNode } from "react";
import { cx } from "@/lib/cx";

/* Column header: --fill row, uppercase 10px labels. */
const TH =
  "border-b border-line bg-fill px-[14px] py-[9px] text-[10px] font-normal tracking-[0.07em] " +
  "whitespace-nowrap text-ink-2 uppercase";

export function Th({
  align = "left",
  className,
  children,
  ...rest
}: ComponentProps<"th"> & { align?: "left" | "right" }) {
  return (
    <th scope="col" className={cx(TH, align === "right" ? "text-right" : "text-left", className)} {...rest}>
      {children}
    </th>
  );
}

export function Td({ className, children, ...rest }: ComponentProps<"td">) {
  return (
    <td className={cx("px-[14px] py-[10px] align-middle", className)} {...rest}>
      {children}
    </td>
  );
}

export function Tr({ className, children, ...rest }: ComponentProps<"tr">) {
  return (
    <tr className={cx("border-b border-line-soft transition-colors duration-[120ms] hover:bg-fill", className)} {...rest}>
      {children}
    </tr>
  );
}

/** `min-width` keeps columns legible; the wrapping card scrolls. */
export function Table({ minWidth, children }: { minWidth: number; children: ReactNode }) {
  return (
    <table className="w-full border-collapse" style={{ minWidth }}>
      {children}
    </table>
  );
}

/** Primary cell: name at 13.5/600 over a 12px --ink-3 second line. */
export function StackedCell({ primary, secondary }: { primary: ReactNode; secondary?: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-[1px]">
      <span className="text-[13.5px] font-semibold text-ink">{primary}</span>
      {secondary ? <span className="text-[12px] text-ink-3">{secondary}</span> : null}
    </div>
  );
}

/**
 * Below ~640px a horizontally scrolled table is usable but not good. Screens
 * that carry a lot of rows render this card list instead — the landing page
 * shows the pattern and the app copies it.
 */
export function CardList({ children }: { children: ReactNode }) {
  return <div className="flex flex-col gap-[10px] sm:hidden">{children}</div>;
}
