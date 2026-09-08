"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

export function CopyMeetLink({ url }: { url: string }) {
  const toast = useToast();
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  return (
    <div>
      <Button
        variant="secondary"
        size={32}
        icon={copied ? "check" : "copy"}
        iconWeight={copied ? "solid" : "light"}
        onClick={async () => {
          await navigator.clipboard?.writeText(url).catch(() => {});
          clearTimeout(timer.current);
          setCopied(true);
          toast({ tone: "ok", title: "Copied", text: url.replace(/^https?:\/\//, "") });
          timer.current = setTimeout(() => setCopied(false), 1800);
        }}
      >
        {copied ? "Copied" : "Copy Meet link"}
      </Button>
    </div>
  );
}
