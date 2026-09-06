import type { CSSProperties } from "react";

/**
 * Font Awesome 6 Sharp, referenced by codepoint exactly as the design source
 * does. Weight carries meaning: `light` (300) for object and navigation
 * glyphs, `solid` (900) for status, close and check glyphs.
 *
 * Every codepoint below was read out of Meetrao.dc.html — do not swap one for
 * a visually similar glyph without checking the source.
 */
export const ICONS = {
  search: "", // magnifying-glass
  check: "",
  close: "", // xmark
  gear: "",
  home: "",
  clock: "",
  download: "",
  list: "",
  video: "",
  chevronLeft: "",
  chevronRight: "",
  circleXmark: "",
  circleCheck: "",
  circleInfo: "",
  arrowRight: "", // used for "log out"
  circleExclamation: "",
  triangleExclamation: "",
  chevronDown: "",
  upload: "", // arrow-up-from-bracket
  globe: "",
  users: "",
  link: "",
  copy: "",
  rotateLeft: "",
  bolt: "",
  cloudArrowUp: "",
  calendar: "", // calendar-days
  userPlus: "",
  sliders: "\uf1de",
  signIn: "\uf2f6",
  plus: "+", // a literal plus, not a glyph — matches the source
} as const;

export type IconName = keyof typeof ICONS;

type IconProps = {
  name: IconName;
  /** 300 for objects and navigation, 900 for status/close/check.
   *  Only these two faces are shipped; see globals.css. */
  weight?: 300 | 900;
  size?: number;
  className?: string;
  style?: CSSProperties;
};

export function Icon({
  name,
  weight = 300,
  size = 13,
  className,
  style,
}: IconProps) {
  return (
    <span
      aria-hidden="true"
      className={className}
      style={{
        fontFamily: "var(--fa)",
        fontWeight: weight,
        fontSize: size,
        lineHeight: 1,
        flex: "none",
        ...style,
      }}
    >
      {ICONS[name]}
    </span>
  );
}
