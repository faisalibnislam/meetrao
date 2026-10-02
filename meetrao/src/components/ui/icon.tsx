import type { CSSProperties } from "react";

/* ─────────────────────────────────────────────────────────────────────────────
   Icons.

   The prototypes reference Font Awesome 6 Sharp by codepoint. That family is
   licensed, so this is an equivalent in-house set drawn on a 24-unit grid,
   keeping the design's weight convention:

     light  (default) — objects and navigation, thin strokes
     solid            — status, check and close, filled

   Square caps and mitred joins give the "sharp" terminals. Names below are
   annotated with the codepoint each one replaces so the designs stay greppable.
   ───────────────────────────────────────────────────────────────────────────── */

type Stroked = { stroke: string };
type Filled = { fill: string };
type Glyph = Stroked | Filled;

const G = {
  /* f002 */ search: {
    stroke: "M10 4a6 6 0 1 0 0 12 6 6 0 0 0 0-12M14.4 14.4 20 20",
  },
  /* f007 */ user: {
    stroke: "M12 4a4 4 0 1 0 0 8 4 4 0 0 0 0-8M4.5 20v-1.4c0-2.2 3.4-4.1 7.5-4.1s7.5 1.9 7.5 4.1V20",
  },
  /* f00c */ check: { stroke: "M4.5 12.4 9.6 17.5 19.5 6.6" },
  /* f00d */ xmark: { stroke: "M5.6 5.6 18.4 18.4M18.4 5.6 5.6 18.4" },
  /* f013 */ gear: {
    stroke:
      "M12 8.8a3.2 3.2 0 1 0 0 6.4 3.2 3.2 0 0 0 0-6.4" +
      "M18.6 12h2M3.4 12h2M12 5.4v-2M12 18.6v2" +
      "M16.7 7.3 18.1 5.9M5.9 18.1l1.4-1.4M16.7 16.7l1.4 1.4M5.9 5.9l1.4 1.4",
  },
  /* f015 */ house: { stroke: "M3 11.6 12 4l9 7.6M5.6 10.2V20h12.8v-9.8" },
  /* f017 */ clock: {
    stroke: "M12 3.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17M12 6.8V12l3.9 2.4",
  },
  /* f019 */ download: { stroke: "M12 4v11.6M7 10.9l5 5 5-5M4.5 19.6h15" },
  /* f023 */ lock: {
    stroke: "M4.8 10.6h14.4v9H4.8zM8.4 10.6V8a3.6 3.6 0 0 1 7.2 0v2.6",
  },
  /* f02b */ tag: {
    stroke: "M3.5 3.5h9.2l7.8 7.8-7.8 7.8-9.2-9.2zM7.6 6.4a1.3 1.3 0 1 0 0 2.6 1.3 1.3 0 0 0 0-2.6",
  },
  /* f03a */ list: {
    stroke: "M9 6.6h11M9 12h11M9 17.4h11M4 5.6h2v2H4zM4 11h2v2H4zM4 16.4h2v2H4z",
  },
  /* f03d */ video: { stroke: "M3.5 6.6h12v10.8h-12zM15.5 10.6l5-3v8.8l-5-3z" },
  /* f04b */ play: { fill: "M7.6 4.6 19.4 12 7.6 19.4z" },
  /* f053 */ "chevron-left": { stroke: "M15 5.6 8.4 12l6.6 6.4" },
  /* f054 */ "chevron-right": { stroke: "M9 5.6 15.6 12 9 18.4" },
  /* f078 */ "chevron-down": { stroke: "M5.6 9 12 15.6 18.4 9" },
  "chevron-up": { stroke: "M5.6 15 12 8.4l6.4 6.6" },
  /* f057 */ "circle-xmark": {
    fill:
      "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18" +
      "M12 13.6l3.3 3.3 1.6-1.6-3.3-3.3 3.3-3.3-1.6-1.6L12 10.4 8.7 7.1 7.1 8.7l3.3 3.3-3.3 3.3 1.6 1.6z",
  },
  /* f058 */ "circle-check": {
    fill:
      "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18" +
      "M10.6 16.9 6.1 12.4l1.7-1.7 2.8 2.8 5.6-5.6 1.7 1.7z",
  },
  /* f059 */ "circle-question": {
    stroke:
      "M12 3.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17" +
      "M9.4 9.6a2.6 2.6 0 1 1 3.5 2.4c-.6.3-.9.8-.9 1.5v.6M12 16.6h.02",
  },
  /* f05a */ "circle-info": {
    fill:
      "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18" +
      "M10.8 6.2h2.4v2.4h-2.4zM10.9 10.2h2.2v7.4h-2.2z",
  },
  /* f061 */ "arrow-right": { stroke: "M4 12h15.4M13.4 6l6 6-6 6" },
  /* arrow-right turned a quarter turn — same shaft length, same head, same
     weight, so the two read as one family where they sit side by side under
     the hero headline. */
  /* f063 */ "arrow-down": { stroke: "M12 4v15.4M6 13.4l6 6 6-6" },
  /* f06a */ "circle-exclamation": {
    fill:
      "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18" +
      "M10.9 6.4h2.2v7.4h-2.2zM10.8 15.4h2.4v2.4h-2.4z",
  },
  /* f06e */ eye: {
    stroke:
      "M2.5 12S6.4 5.6 12 5.6 21.5 12 21.5 12 17.6 18.4 12 18.4 2.5 12 2.5 12" +
      "M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6",
  },
  /* f070 */ "eye-slash": {
    stroke:
      "M4.2 8.4C3 9.9 2.5 12 2.5 12S6.4 18.4 12 18.4c1.7 0 3.2-.6 4.4-1.4" +
      "M19 15.3c1.7-1.6 2.5-3.3 2.5-3.3S17.6 5.6 12 5.6c-1 0-1.9.2-2.7.5" +
      "M4 4l16 16",
  },
  /* f071 */ "triangle-exclamation": {
    fill:
      "M12 2.8 22.4 20.6H1.6z" +
      "M10.9 9.2h2.2v5.8h-2.2zM10.8 16.4h2.4v2.4h-2.4z",
  },
  /* f08e */ "external-link": {
    stroke: "M13.6 4H20v6.4M20 4l-8.4 8.4M18 13.6v6.2H4.4V6.2h6.2",
  },
  /* f090 */ "sign-in": { stroke: "M14 4.5h5.5v15H14M3 12h11M10.6 8.4 14.2 12l-3.6 3.6" },
  /* f093 */ upload: { stroke: "M12 19.6V8M7 12.6l5-5 5 5M4.5 4.4h15" },
  /* f0ac */ globe: {
    stroke:
      "M12 3.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17" +
      "M12 3.5c-3.6 3.6-3.6 13.4 0 17M12 3.5c3.6 3.6 3.6 13.4 0 17M3.9 9h16.2M3.9 15h16.2",
  },
  /* f0ae */ "rectangle-list": {
    stroke: "M3 5h18v14H3zM7.4 9.4h9.2M7.4 14.6h9.2",
  },
  /* f0c0 */ users: {
    stroke:
      "M9.4 4.6a3.4 3.4 0 1 0 0 6.8 3.4 3.4 0 0 0 0-6.8" +
      "M2.8 19.4v-1.2c0-2 3-3.7 6.6-3.7s6.6 1.7 6.6 3.7v1.2" +
      "M16.4 5.4a3 3 0 0 1 0 6M18.4 14.6c1.7.5 2.8 1.6 2.8 2.9v1.2",
  },
  /* f0c1 */ link: {
    stroke:
      "M13.5 10.5a4.5 4.5 0 0 0-6.4 0l-3.2 3.2a4.5 4.5 0 0 0 6.4 6.4l1.6-1.6" +
      "M10.5 13.5a4.5 4.5 0 0 0 6.4 0l3.2-3.2a4.5 4.5 0 0 0-6.4-6.4l-1.6 1.6",
  },
  /* f0c5 */ copy: { stroke: "M8.5 8.5H20V20H8.5zM15.5 8.5V4H4v11.5h4.5" },
  /* f0e0 */ envelope: { stroke: "M3 5.5h18v13H3zM3 6.4l9 7 9-7" },
  /* f0e2 */ "rotate-left": {
    stroke: "M3.6 12a8.4 8.4 0 1 0 2.9-6.4L3.4 8.2M3.4 3.6v4.6h4.6",
  },
  /* f0e7 */ bolt: { fill: "M13.8 2.6 5.6 13.8h5.4L10 21.4l8.4-11.6h-5.6z" },
  /* f0eb */ lightbulb: {
    stroke: "M9.2 18.4h5.6M9.8 21h4.4M12 3.4a6 6 0 0 0-3.6 10.8v2.2h7.2v-2.2A6 6 0 0 0 12 3.4",
  },
  /* f0ee */ "cloud-upload": {
    stroke:
      "M6.6 18.4A3.9 3.9 0 0 1 6 10.7a5.6 5.6 0 0 1 10.8-1.5 3.9 3.9 0 0 1 .6 9.2" +
      "M12 20.4V9.6M8.8 12.6 12 9.4l3.2 3.2",
  },
  /* f133 */ calendar: {
    stroke:
      "M3.4 5.8h17.2v14.4H3.4zM3.4 10h17.2M7.8 3.4v3.6M16.2 3.4v3.6" +
      "M7.2 13h1.8M11.1 13h1.8M15 13h1.8M7.2 16.6h1.8M11.1 16.6h1.8M15 16.6h1.8",
  },
  /* f19d */ "graduation-cap": {
    stroke: "M2.4 8.8 12 4.2l9.6 4.6-9.6 4.6zM6.6 11v5.2c0 1.7 2.4 2.8 5.4 2.8s5.4-1.1 5.4-2.8V11",
  },
  /* f1de */ sliders: {
    stroke:
      "M3 7h18M3 12h18M3 17h18" +
      "M7.4 5.2h2.2v3.6H7.4zM14.4 10.2h2.2v3.6h-2.2zM9.4 15.2h2.2v3.6H9.4z",
  },
  /* f201 */ "chart-line": {
    stroke: "M3.6 3.6v16.8h16.8M7 16.4l3.8-4.6 3.2 2.6 4.6-6",
  },
  /* f234 */ "user-plus": {
    stroke:
      "M9.6 4.6a3.6 3.6 0 1 0 0 7.2 3.6 3.6 0 0 0 0-7.2" +
      "M2.8 20v-1.3c0-2.1 3.1-3.9 6.8-3.9 1.2 0 2.4.2 3.4.5" +
      "M17.6 12.4v6.4M14.4 15.6h6.4",
  },
  /* f292 */ hashtag: { stroke: "M9 3.6 6.8 20.4M17.2 3.6 15 20.4M4.2 8.6h16M3.8 15.4h16" },
  /* f2bb */ "address-card": {
    stroke:
      "M2.6 5h18.8v14H2.6z" +
      "M8.2 8.6a2.2 2.2 0 1 0 0 4.4 2.2 2.2 0 0 0 0-4.4" +
      "M4.8 16.4c0-1.4 1.6-2.4 3.4-2.4s3.4 1 3.4 2.4M14.6 9.6h4.4M14.6 13.4h4.4",
  },
  /* f53f */ palette: {
    /* The classic shape: a round palette with a bite out of the lower right
       and three wells of colour. Strokes throughout, like the rest of the
       light set, so the wells are arc pairs rather than filled circles.

       Each segment is its own string with the join spelled out. The first
       draft concatenated them without separators, which ran "4.2" into "0"
       and turned the outline into a hook with no wells at all. */
    stroke: [
      "M12 3.6a8.4 8.4 0 1 0 0 16.8",
      "c1.3 0 2.3-1 2.3-2.2 0-.6-.2-1-.5-1.4-.3-.4-.5-.8-.5-1.3 0-1 .8-1.8 1.8-1.8",
      "h1.9c2.4 0 4.3-1.9 4.3-4.3 0-3.2-4-5.8-9.3-5.8",
      "M8.1 8.4a1.1 1.1 0 1 0 0 2.2 1.1 1.1 0 0 0 0-2.2",
      "M12.6 6.9a1.1 1.1 0 1 0 0 2.2 1.1 1.1 0 0 0 0-2.2",
      "M6.9 13.2a1.1 1.1 0 1 0 0 2.2 1.1 1.1 0 0 0 0-2.2",
    ].join(" "),
  },
  /* f2f5 */ "sign-out": { stroke: "M14 4.5H4.5v15H14M10 12h11M17.4 8.4 21 12l-3.6 3.6" },
  plus: { stroke: "M12 4.6v14.8M4.6 12h14.8" },
  minus: { stroke: "M4.6 12h14.8" },
} satisfies Record<string, Glyph>;

export type IconName = keyof typeof G;

/** Every glyph, in declaration order. The gallery at /preview enumerates this
    rather than a copied list, so a new icon shows up there for free. */
export const ICON_NAMES = Object.keys(G) as IconName[];

/** The seven glyphs drawn as fills; the rest are stroked. */
export const FILLED_ICONS = (Object.keys(G) as IconName[]).filter((n) => "fill" in G[n]);

/** Every codepoint the design files reference, mapped to a name in this set. */
export const FA_CODEPOINTS: Record<string, IconName> = {
  f002: "search",
  f007: "user",
  f00c: "check",
  f00d: "xmark",
  f013: "gear",
  f015: "house",
  f017: "clock",
  f019: "download",
  f023: "lock",
  f02b: "tag",
  f03a: "list",
  f03d: "video",
  f04b: "play",
  f053: "chevron-left",
  f054: "chevron-right",
  f057: "circle-xmark",
  f058: "circle-check",
  f059: "circle-question",
  f05a: "circle-info",
  f061: "arrow-right",
  f063: "arrow-down",
  f06a: "circle-exclamation",
  f06e: "eye",
  f070: "eye-slash",
  f071: "triangle-exclamation",
  f078: "chevron-down",
  f08e: "external-link",
  f090: "sign-in",
  f093: "upload",
  f0ac: "globe",
  f0ae: "rectangle-list",
  f0c0: "users",
  f0c1: "link",
  f0c5: "copy",
  f0e0: "envelope",
  f0e2: "rotate-left",
  f0e7: "bolt",
  f0eb: "lightbulb",
  f0ee: "cloud-upload",
  f133: "calendar",
  f19d: "graduation-cap",
  f1de: "sliders",
  f201: "chart-line",
  f234: "user-plus",
  f292: "hashtag",
  f2bb: "address-card",
  f2f5: "sign-out",
};

export type IconProps = {
  name: IconName;
  /** Rendered box in px. The design references glyphs at 8–18px. */
  size?: number;
  /** light = FA 300 (objects, navigation) · solid = FA 900 (status, check, close) */
  weight?: "light" | "solid";
  className?: string;
  style?: CSSProperties;
  title?: string;
};

export function Icon({ name, size = 13, weight = "light", className, style, title }: IconProps) {
  const glyph: Glyph = G[name];
  const isFilled = "fill" in glyph;

  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
      style={{ display: "block", flex: "none", ...style }}
      aria-hidden={title ? undefined : true}
      role={title ? "img" : undefined}
      focusable="false"
    >
      {title ? <title>{title}</title> : null}
      {isFilled ? (
        <path d={glyph.fill} fill="currentColor" fillRule="evenodd" clipRule="evenodd" />
      ) : (
        <path
          d={glyph.stroke}
          fill="none"
          stroke="currentColor"
          strokeWidth={weight === "solid" ? 2.3 : 1.4}
          strokeLinecap="square"
          strokeLinejoin="miter"
        />
      )}
    </svg>
  );
}
