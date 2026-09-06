import { cn } from "@/lib/cn";

/**
 * The 12px inline button spinner. The prototype only ever renders it on filled
 * buttons, so the track is white at 35% and the head is solid white.
 */
export function Spinner({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "block size-[12px] flex-none rounded-full border-2 border-white/35 border-t-white animate-mu-spin",
        className,
      )}
    />
  );
}
