import Image from "next/image";
import Link from "next/link";
import { cx } from "@/lib/cx";

/* The supplied SVG, used as-is. Wordmark ink #1A1917, mark green #16554A/#268574. */
const RATIO = 576 / 127;

export function Logo({ height = 20, className }: { height?: number; className?: string }) {
  return (
    <Image
      src="/brand/meetrao-logo.svg"
      alt="Meetrao"
      width={Math.round(height * RATIO)}
      height={height}
      priority
      className={cx("block w-auto", className)}
      style={{ height }}
    />
  );
}

/** On auth and public screens the logo returns to the landing page. */
export function LogoLink({ height = 20, className }: { height?: number; className?: string }) {
  return (
    <Link href="/" title="Meetrao home" className={cx("unlink block self-start", className)}>
      <Logo height={height} />
    </Link>
  );
}

export function GoogleG({ size = 16 }: { size?: number }) {
  return (
    <Image
      src="/brand/google-g.svg"
      alt=""
      width={size}
      height={size}
      className="block flex-none"
      style={{ width: size, height: size }}
    />
  );
}
