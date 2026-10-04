"use client";

import Link from "next/link";
import { useEffect } from "react";
import { buttonClass } from "@/components/ui/button-class";
import { StatusPage } from "@/components/ui/status-page";

/* What a thrown error shows outside the app, instead of the framework's bare
   "Application error". The message is never shown: from a Server Component
   it is replaced with a generic one anyway, and the digest is what matches
   the server's log line, so that is what a person can quote to support.

   This boundary is part of every route's first load, so it imports nothing
   it can do without: the button classes rather than the Button component,
   whose module brings the whole icon set, and the one glyph it needs drawn
   inline (Icon's circle-exclamation, at Icon's metrics). */
export default function RootError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <StatusPage
      mark={
        <svg viewBox="0 0 24 24" width={16} height={16} aria-hidden="true" focusable="false" className="block flex-none">
          <path
            d="M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18M10.9 6.4h2.2v7.4h-2.2zM10.8 15.4h2.4v2.4h-2.4z"
            fill="currentColor"
            fillRule="evenodd"
            clipRule="evenodd"
          />
        </svg>
      }
      tone="red"
      title="Something went wrong on our side"
      actions={
        <>
          <button type="button" className={buttonClass("accent", 38)} onClick={() => retry()}>
            Try again
          </button>
          <Link href="/" className={buttonClass("secondary", 38, "unlink no-underline")}>
            Go to the home page
          </Link>
        </>
      }
    >
      Nothing you did caused this, and trying again usually works.
      {error.digest ? ` If it keeps happening, tell support the code ${error.digest}.` : null}
    </StatusPage>
  );
}
