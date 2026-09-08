import Image from "next/image";
import { Icon } from "@/components/ui/icon";
import { cx } from "@/lib/cx";

/**
 * A photograph, or a labelled frame standing in for one.
 *
 * The design leaves ten of these to real photography. Given a `src` this is
 * simply the photo; without one it is a visible, named frame — impossible to
 * mistake for finished art, and it degrades one slot at a time as photos
 * arrive rather than all-or-nothing.
 */
export function ImageFrame({
  label,
  className,
  ground = "bg-fill-2",
  rounded = "rounded-[14px]",
  avatar = false,
  src,
  sizes,
}: {
  label: string;
  className?: string;
  ground?: string;
  rounded?: string;
  /** An avatar slot — 28 to 38px. Too small for the caption, which clips into
      nonsense ("GUEST" renders as "UES"), so it shows a figure and nothing else.
      The frame still reads as a placeholder; it just stops reading as broken. */
  avatar?: boolean;
  /** Public path to the real photograph, when one exists. */
  src?: string;
  /** Passed to next/image. Worth setting wherever the rendered width is known. */
  sizes?: string;
}) {
  if (src) {
    return (
      <div className={cx("relative overflow-hidden", rounded, className)}>
        {/* Decorative: every one of these sits behind a caption that already
            names the thing, so a description here would only repeat it. */}
        <Image src={src} alt="" fill sizes={sizes} className="object-cover" />
      </div>
    );
  }

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
