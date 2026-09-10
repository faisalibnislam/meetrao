"use client";

import { useEffect, useState } from "react";

/* The token table reads its own values out of the cascade rather than repeating
   them. A hardcoded hex here would be a second source of truth that drifts the
   first time globals.css changes — and a gallery that lies about a token is
   worse than no gallery. */

export function TokenSwatch({ name, on = "surface" }: { name: string; on?: "surface" | "ground" | "dark" }) {
  const [value, setValue] = useState<string>("");

  useEffect(() => {
    const read = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    setValue(read);
  }, [name]);

  const chip =
    on === "dark"
      ? "border-white/25"
      : on === "ground"
        ? "border-line-strong"
        : "border-line";

  return (
    <div className="flex min-w-0 items-center gap-[10px] rounded-[8px] border border-line bg-surface p-[10px]">
      <span
        aria-hidden="true"
        className={`h-[34px] w-[34px] flex-none rounded-[6px] border ${chip}`}
        style={{ background: `var(${name})` }}
      />
      <span className="flex min-w-0 flex-1 flex-col gap-[1px]">
        <code className="overflow-hidden text-[11.5px] text-ellipsis whitespace-nowrap text-ink">{name}</code>
        <code className="overflow-hidden text-[11px] text-ellipsis whitespace-nowrap text-ink-3">
          {value || "—"}
        </code>
      </span>
    </div>
  );
}

/** Shadow and font tokens are not colours; they get their own read-back row. */
export function TokenValue({ name, sample }: { name: string; sample?: "shadow" | "font" }) {
  const [value, setValue] = useState<string>("");

  useEffect(() => {
    setValue(getComputedStyle(document.documentElement).getPropertyValue(name).trim());
  }, [name]);

  return (
    <div className="flex min-w-0 flex-col gap-[8px] rounded-[8px] border border-line bg-surface p-[12px]">
      {sample === "shadow" ? (
        <span
          aria-hidden="true"
          className="h-[40px] w-full rounded-[8px] border border-line bg-surface"
          style={{ boxShadow: `var(${name})` }}
        />
      ) : sample === "font" ? (
        <span className="text-[19px] leading-[1.2] text-ink" style={{ fontFamily: `var(${name})` }}>
          Meetrao 0123
        </span>
      ) : null}
      <span className="flex min-w-0 flex-col gap-[1px]">
        <code className="text-[11.5px] text-ink">{name}</code>
        <code className="overflow-hidden text-[11px] text-ellipsis whitespace-nowrap text-ink-3">
          {value || "—"}
        </code>
      </span>
    </div>
  );
}
