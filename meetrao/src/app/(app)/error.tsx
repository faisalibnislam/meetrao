"use client";

import { useEffect } from "react";
import { AppScreen } from "@/components/app/app-screen";
import { buttonClass } from "@/components/ui/button-class";
import { EmptyState } from "@/components/ui/panels";

/* A screen inside the app that threw. Sits below the layout, so the sidebar
   stays and every other screen is still one click away; without it a single
   failed read replaced the whole app with the framework's bare error page.
   `retry` re-fetches this screen's data and renders it again. The button
   classes rather than the Button component, which would add its own module
   to the first load of every app route for one button nobody usually sees. */
export default function AppError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <AppScreen title="Something went wrong">
      <EmptyState
        title="This screen didn't load"
        text={`Nothing you did caused this, and trying again usually works.${
          error.digest ? ` If it keeps happening, tell support the code ${error.digest}.` : ""
        }`}
        action={
          <button type="button" className={buttonClass("accent", 32)} onClick={() => retry()}>
            Try again
          </button>
        }
      />
    </AppScreen>
  );
}
