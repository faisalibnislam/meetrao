"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { copyText } from "@/lib/clipboard";

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
          if (!(await copyText(url))) return;
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
