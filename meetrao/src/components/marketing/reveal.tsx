"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { cx } from "@/lib/cx";
import { useMediaQuery } from "@/lib/use-client-value";

/**
 * Reveal on scroll. Under `prefers-reduced-motion` the content is simply
 * visible from the first paint. The guard is not decoration, it is the whole
 * behaviour switched off.
 */
export function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [seen, setSeen] = useState(false);

  // Under reduced motion the content is simply visible from the first paint,
  // the guard is not decoration, it is the whole behaviour switched off.
  const reduced = useMediaQuery("(prefers-reduced-motion: reduce)");
  const shown = seen || reduced;

  useEffect(() => {
    if (reduced) return;

    const node = ref.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setSeen(true);
            observer.disconnect();
          }
        }
      },
      { rootMargin: "0px 0px -10% 0px" },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [reduced]);

  return (
    <div
      ref={ref}
      className={cx(
        "transition-[opacity,transform] duration-[620ms] ease-[cubic-bezier(.22,1,.36,1)]",
        shown ? "translate-y-0 opacity-100" : "translate-y-[16px] opacity-0",
        className,
      )}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}
