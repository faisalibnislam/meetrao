import { Icon } from "@/components/ui/icon";
import { cx } from "@/lib/cx";

/**
 * A labelled empty frame where real photography goes.
 *
 * The design leaves ten of these. Stock or generated images are explicitly not
 * a substitute, so the frames ship as frames until real photos exist — visible,
 * named, and impossible to mistake for finished art.
 */
export function ImageFrame({
  label,
  className,
  ground = "bg-fill-2",
  rounded = "rounded-[14px]",
  avatar = false,
}: {
  label: string;
  className?: string;
  ground?: string;
  rounded?: string;
  /** An avatar slot — 28 to 38px. Too small for the caption, which clips into
      nonsense ("GUEST" renders as "UES"), so it shows a figure and nothing else.
      The frame still reads as a placeholder; it just stops reading as broken. */
  avatar?: boolean;
}) {
  return (
    <div
      role="img"
      aria-label={`Photography placeholder: ${label}`}
      className={cx(
        "flex items-center justify-center overflow-hidden border border-dashed border-line-strong",
        ground,
        rounded,
        className,
      )}
    >
      {avatar ? (
        <Icon name="user" size={13} className="text-ink-3" />
      ) : (
        <span className="flex flex-col items-center gap-[6px] px-[10px] text-center">
          <Icon name="tag" size={14} className="text-ink-3" />
          <span className="font-mono text-[10px] tracking-[0.07em] text-ink-3 uppercase">{label}</span>
        </span>
      )}
    </div>
  );
}
