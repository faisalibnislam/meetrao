import Image from "next/image";

/** Intrinsic size of assets/meetrao-logo.svg (mark + wordmark). */
const NATURAL_WIDTH = 576;
const NATURAL_HEIGHT = 127;

/**
 * The supplied logo, scaled by height. The wordmark ink is already `#1A1917`
 * to match the ink token and the green mark is untouched — use the SVG as-is.
 */
export function Logo({ height = 21 }: { height?: number }) {
  const width = Math.round((height * NATURAL_WIDTH) / NATURAL_HEIGHT);
  return (
    <Image
      src="/assets/meetrao-logo.svg"
      alt="Meetrao"
      width={width}
      height={height}
      priority
      className="block h-auto w-auto"
      style={{ height, width }}
    />
  );
}

export function GoogleG({ size = 16 }: { size?: number }) {
  return (
    <Image
      src="/assets/google-g.svg"
      alt=""
      width={size}
      height={size}
      className="block flex-none"
      style={{ height: size, width: size }}
    />
  );
}
