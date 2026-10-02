"use client";

import Link from "next/link";
import Script from "next/script";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";

/* ─────────────────────────────────────────────────────────────────────────────
   Google Analytics, and the banner that is the only way it ever loads.

   The rule this file exists to enforce: until someone presses Accept, no script
   from googletagmanager.com is on the page, no request reaches Google, and no
   cookie is written. Not "loaded with consent mode set to denied", not loaded.
   That is a stronger promise than the usual banner makes, it is the promise the
   Privacy Policy makes, and it is enforced here by the scripts simply not being
   rendered.

   The first-party counter in beacon.tsx runs either way, because it is
   cookie-free and stores nothing on the device. Declining turns off Google, and
   the banner says exactly that rather than implying it turns off counting.

   No banner at all when NEXT_PUBLIC_GA_MEASUREMENT_ID is unset: there is then
   nothing to consent to, and asking anyway would be theatre.
   ───────────────────────────────────────────────────────────────────────────── */

const STORAGE_KEY = "meetrao.analytics-consent";

/** Fires whenever the stored answer changes, including from another component. */
const CONSENT_EVENT = "meetrao:analytics-consent";

type Choice = "granted" | "denied";

/* Three states, and the third is the one that makes this work.

     "granted" / "denied" (the visitor has answered
     "unanswered"        ) read the browser, nothing stored, so ask
     "unread"            , running on the server, or hydrating; ask nothing yet

   Without "unread" the server would have to guess, and its only possible guess
   is "unanswered", which puts the banner in the HTML and flashes it at every
   returning visitor who already said no. */
type Stored = Choice | "unanswered" | "unread";

/* The answer given during this page load, when there was one.
   Consulted before storage so that a visitor whose browser refuses localStorage
   (private mode, blocked site data) still gets the thing they just pressed.
   Without it, Accept in a private window writes nothing, reads back nothing,
   and leaves the banner sitting there as though the button were broken. */
let answeredHere: Choice | null = null;

function readChoice(): Stored {
  if (answeredHere) return answeredHere;
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value === "granted" || value === "denied" ? value : "unanswered";
  } catch {
    /* Storage blocked outright. Treated as not asked yet: the banner reappears
       on the next visit and Google stays off, so the failure mode leans towards
       not loading it. */
    return "unanswered";
  }
}

/* localStorage is an external store, so this is useSyncExternalStore's exact
   job, and it is also the one way to read it without setting state inside an
   effect, which cascades a render on every page in the app.

   `storage` covers the same person answering in a second tab; CONSENT_EVENT
   covers the Privacy Policy's "change your choice" button in this one. */
function subscribe(onChange: () => void): () => void {
  window.addEventListener(CONSENT_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(CONSENT_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

const unread = (): Stored => "unread";

export function AnalyticsConsent({ measurementId }: { measurementId: string }) {
  const choice = useSyncExternalStore(subscribe, readChoice, unread);

  const decide = useCallback((next: Choice) => {
    answeredHere = next;
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* Not remembered past this page load, but honoured for it. */
    }
    window.dispatchEvent(new Event(CONSENT_EVENT));
  }, []);

  if (!measurementId) return null;

  return (
    <>
      {choice === "granted" ? <GoogleAnalytics measurementId={measurementId} /> : null}
      {choice === "unanswered" ? <Banner onDecide={decide} /> : null}
    </>
  );
}

/* ── the banner ────────────────────────────────────────────────────────────── */

function Banner({ onDecide }: { onDecide: (choice: Choice) => void }) {
  return (
    <div
      /* Above the sticky nav (z-60) and the app sidebar (z-70), below modals
         (z-120) and toasts (z-130): a dialog opened from underneath it must not
         end up behind it. */
      className="fixed inset-x-0 bottom-0 z-110 flex justify-center p-[16px] max-[560px]:p-0"
      /* Not a modal: it does not trap focus and the page stays usable while it
         is up. `region` with a label, so a screen reader can find and skip it. */
      role="region"
      aria-label="Analytics cookies"
    >
      <div
        className={
          "box-border flex w-full max-w-[620px] flex-wrap items-center gap-x-[16px] gap-y-[12px] " +
          "rounded-[9px] border border-line-strong bg-surface px-[16px] py-[14px] shadow-[0_6px_28px_rgba(26,25,23,0.14)] " +
          "max-[560px]:max-w-none max-[560px]:rounded-none max-[560px]:border-x-0 max-[560px]:border-b-0 " +
          /* Edge to edge on a phone, and clear of the home-bar inset. A button
             half under iOS's gesture area is a button that cannot be pressed. */
          "max-[560px]:[padding-bottom:calc(14px_+_env(safe-area-inset-bottom))]"
        }
      >
        <p className="m-0 min-w-[220px] flex-1 text-[13px] leading-[1.5] text-ink-2">
          Meetrao counts page views without cookies. May we also load Google Analytics, which does set
          cookies? <Link href="/privacy">Privacy Policy</Link>.
        </p>

        <div className="flex flex-none gap-[8px] max-[420px]:w-full max-[420px]:flex-col-reverse">
          {/* Decline first in the DOM and visually equal in weight. A banner
              whose only real button is Accept is not asking. */}
          <Button size={36} variant="secondary" onClick={() => onDecide("denied")} className="max-[420px]:w-full">
            No thanks
          </Button>
          <Button size={36} variant="accent" onClick={() => onDecide("granted")} className="max-[420px]:w-full">
            Accept
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ── changing your mind ───────────────────────────────────────────────────── */

/**
 * Puts the banner back up. Rendered in the Privacy Policy, because a consent
 * choice you cannot revisit is not a choice, and reloading the page to offer
 * it again would throw away the reader's position in a long document.
 *
 * Renders nothing when Google Analytics is not configured, matching the banner.
 */
export function ChangeAnalyticsChoice({ measurementId }: { measurementId: string }) {
  if (!measurementId) return null;

  return (
    <Button
      size={34}
      variant="secondary"
      onClick={() => {
        answeredHere = null;
        try {
          localStorage.removeItem(STORAGE_KEY);
        } catch {
          /* Nothing stored to remove. The banner still comes back. */
        }
        window.dispatchEvent(new Event(CONSENT_EVENT));
      }}
    >
      Change your analytics choice
    </Button>
  );
}

/* ── Google Analytics itself ───────────────────────────────────────────────── */

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

function GoogleAnalytics({ measurementId }: { measurementId: string }) {
  const pathname = usePathname();

  /* GA4's own page_view fires once, when the tag loads. This app is a client-
     side router, so every navigation after the first would be invisible. The
     landing page would look like the only page anyone reads. `send_page_view:
     false` below hands the job to this effect instead, which also covers the
     first view, so there is one code path and no double-count. */
  useEffect(() => {
    if (!pathname || typeof window.gtag !== "function") return;
    window.gtag("event", "page_view", {
      page_path: pathname,
      page_location: window.location.href,
      page_title: document.title,
    });
  }, [pathname]);

  return (
    <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`} strategy="afterInteractive" />
      <Script id="ga-init" strategy="afterInteractive">
        {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
window.gtag = gtag;
gtag('js', new Date());
gtag('config', '${measurementId}', { send_page_view: false });`}
      </Script>
    </>
  );
}
