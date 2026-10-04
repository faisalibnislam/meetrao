"use client";

import { useEffect } from "react";
import { Button, ButtonLink } from "@/components/ui/button";
import { StatusPage } from "@/components/ui/status-page";

/* What a thrown error shows outside the app, instead of the framework's bare
   "Application error". The message is never shown: from a Server Component
   it is replaced with a generic one anyway, and the digest is what matches
   the server's log line, so that is what a person can quote to support. */
export default function RootError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <StatusPage
      icon="circle-exclamation"
      tone="red"
      title="Something went wrong on our side"
      actions={
        <>
          <Button variant="accent" size={38} onClick={() => retry()}>
            Try again
          </Button>
          <ButtonLink variant="secondary" size={38} href="/">
            Go to the home page
          </ButtonLink>
        </>
      }
    >
      Nothing you did caused this, and trying again usually works.
      {error.digest ? ` If it keeps happening, tell support the code ${error.digest}.` : null}
    </StatusPage>
  );
}
