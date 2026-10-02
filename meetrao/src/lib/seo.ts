import { POSTAL_ADDRESS, SUPPORT_EMAIL } from "@/lib/contact";
import { siteUrl } from "@/lib/env";

/* ─────────────────────────────────────────────────────────────────────────────
   What Meetrao says it is, to a search engine and to an agent reading the page.

   Two audiences now, not one. A person searching types "free scheduling app"
   and reads a title. A model answering "what can I use instead of Calendly?"
   reads the JSON-LD and the first paragraph. Both want the same thing (a plain
   statement of the category, the price and the constraints) which is
   convenient, because it is also what an honest page says.

   Every claim here has to survive being read next to /terms. Terms §5 says
   Meetrao is free during beta and that paid plans may follow. So nothing on
   this page says "free forever": it says free, no card, no trial countdown, and
   an Offer of 0 that is true today. Structured data that contradicts your own
   Terms is the kind of thing that loses a rich result and deserves to.
   ───────────────────────────────────────────────────────────────────────────── */

export const SITE_NAME = "Meetrao";

/** The one-line answer to "what is this". Used in JSON-LD and as the fallback description. */
export const TAGLINE = "Free appointment booking and meeting scheduling";

/**
 * The suffix every page title carries, and the whole title of the home page.
 *
 * Two rules decide the shape of these, and they pull against each other.
 *
 * A title is cut at roughly 60 characters, so there is room for about three
 * ideas. And "Meetrao" is not one of the three: nobody is searching for a word
 * they have never heard, so the brand goes last, after the category. That is
 * the opposite of the advice you would give a known name, and it inverts again
 * the moment anyone searches for this one by name.
 *
 * The home page therefore spends its whole title on the two categories people
 * actually type ("meeting scheduling app" and "appointment booking") plus the
 * one word that separates this from the field, which is "free". Everything else
 * about the product has 155 characters of description to live in.
 *
 * `TITLE` is absolute: the template is not applied to it. Applied, it would
 * read "… · Meetrao · Meetrao", which is how a brand ends up in a title twice
 * and is checked in seo-invariants.test.ts rather than remembered.
 */
export const TITLE = "Free Meeting Scheduling & Appointment Booking · Meetrao";
export const TITLE_TEMPLATE = "%s · Meetrao";

/**
 * The snippet.
 *
 * Kept under 155 characters because that is roughly where a search result is
 * cut, and a description that ends mid-clause reads as carelessness on the one
 * line a stranger sees. The longer version of this pitch lives on the page.
 *
 * It closes on the three denials rather than opening with them. "No card, no
 * trial, no locked features" is the claim a reader of this category has learned
 * to distrust, so it lands better after the sentence that says what the thing
 * actually does, and each of the three is separately true, which is the only
 * reason to write it at all. Terms §5 keeps the promise honest: free today,
 * paid plans possible later, existing accounts told first.
 */
export const DESCRIPTION =
  "Share one link, guests pick a time you're free, every booking gets a Google Meet link. " +
  "Free to use; Pro is $10 a year for your own domain and a team link.";

/**
 * The social card, spelled out on every page that declares its own openGraph.
 *
 * Next replaces a parent's `openGraph` object rather than merging into it, so a
 * page that sets og:title and forgets og:image ships without one, which is a
 * blank grey rectangle in a Slack unfurl and was true of five pages here.
 */
export const OG_IMAGE = {
  url: "/og.png",
  width: 1200,
  height: 630,
  alt: "Meetrao: meeting scheduling and appointment booking, free",
} as const;

/**
 * Keywords, kept because agents and some crawlers still read them.
 *
 * Google has ignored the keywords meta since 2009 and this will not move a
 * ranking by itself. It is here for the retrieval systems that do index it,
 * and it is short because a stuffed list is a quality signal in the wrong
 * direction.
 */
export const KEYWORDS = [
  "free meeting scheduling app",
  "free appointment booking",
  "meeting scheduler",
  "appointment scheduling software",
  "booking link",
  "free Calendly alternative",
  "Cal.com alternative",
  "Google Calendar scheduling",
  "Google Meet booking",
];

/** Absolute URL for a path. Canonical tags and JSON-LD both need one. */
export function absoluteUrl(path = "/"): string {
  return new URL(path, siteUrl()).toString();
}

/* ── structured data ───────────────────────────────────────────────────────── */

type Json = Record<string, unknown>;

/**
 * Who runs this. Carries the same address as the footer and the Privacy Policy,
 * from the same constant. A third spelling of the operator would undo the
 * point of lib/contact.ts.
 */
export function organizationLd(): Json {
  const [street, city, country] = POSTAL_ADDRESS.split(", ");
  return {
    "@type": "Organization",
    "@id": absoluteUrl("/#organization"),
    name: SITE_NAME,
    url: absoluteUrl("/"),
    description: `${TAGLINE}, operated by one person.`,
    logo: absoluteUrl("/brand/meetrao-email-logo.png"),
    email: SUPPORT_EMAIL,
    address: {
      "@type": "PostalAddress",
      streetAddress: street,
      addressLocality: (city ?? "").replace(/\s+\d+$/, ""),
      postalCode: (city ?? "").match(/\d+$/)?.[0] ?? "",
      addressCountry: country ?? "Bangladesh",
    },
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer support",
      email: SUPPORT_EMAIL,
      availableLanguage: "English",
    },
  };
}

/**
 * The product itself.
 *
 * `price: "0"` is a statement about today, which is what schema.org offers are.
 * `featureList` is the part an agent actually quotes back, so it reads as
 * capabilities rather than adjectives, and it stops where the product stops.
 */
export function softwareApplicationLd(): Json {
  return {
    "@type": "SoftwareApplication",
    "@id": absoluteUrl("/#app"),
    name: SITE_NAME,
    alternateName: "Meetrao scheduling",
    applicationCategory: "BusinessApplication",
    applicationSubCategory: "Appointment Scheduling",
    operatingSystem: "Web browser",
    url: absoluteUrl("/"),
    description: DESCRIPTION,
    /* The machine-readable half of the pitch. An assistant asked for a free
       scheduling tool can filter on this; "free" in a description is prose it
       has to believe. Same claim as the Offer below, same expiry: true today,
       and Terms §5 governs what happens if that changes. */
    isAccessibleForFree: true,
    softwareHelp: { "@type": "CreativeWork", url: absoluteUrl("/help") },
    publisher: { "@id": absoluteUrl("/#organization") },
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
      description:
        "Free to use. No credit card, no trial period and no per-seat pricing. " +
        "If paid plans are ever introduced, existing accounts are told first and have to opt in.",
    },
    featureList: [
      "One public booking link per person",
      "Google Calendar conflict checking, so no double bookings",
      "A Google Meet link on every confirmed booking",
      "Guests book without creating an account",
      "Automatic timezone conversion for guests",
      "Weekly working hours with multiple ranges per day",
      "Buffers, minimum notice and a booking window",
      "Email confirmations to both sides, and cancellation from either",
    ],
    /* No aggregateRating and no review. Both are easy to invent, both produce a
       star rating in search results, and inventing one is fraud. */
  };
}

/** The site, so the two nodes above have something to hang off. */
export function webSiteLd(): Json {
  return {
    "@type": "WebSite",
    "@id": absoluteUrl("/#website"),
    name: SITE_NAME,
    url: absoluteUrl("/"),
    description: DESCRIPTION,
    isAccessibleForFree: true,
    publisher: { "@id": absoluteUrl("/#organization") },
    inLanguage: "en",
  };
}

/** Built from the real FAQ array, so the two can never drift apart. */
export function faqLd(entries: readonly (readonly [string, string, string])[]): Json {
  return {
    "@type": "FAQPage",
    mainEntity: entries.map(([, question, answer]) => ({
      "@type": "Question",
      name: question,
      acceptedAnswer: { "@type": "Answer", text: answer },
    })),
  };
}

/** A trail for a page below the root. Two levels is all this site is deep. */
export function breadcrumbLd(trail: readonly (readonly [string, string])[]): Json {
  return {
    "@type": "BreadcrumbList",
    itemListElement: trail.map(([name, path], i) => ({
      "@type": "ListItem",
      position: i + 1,
      name,
      item: absoluteUrl(path),
    })),
  };
}

/**
 * One graph per page rather than several loose scripts, so the nodes can
 * reference each other by @id. An Organization defined once and pointed at is
 * what lets a consumer know the publisher of the app and the publisher of the
 * site are the same body, rather than two organisations that share a name.
 */
export function graph(...nodes: Json[]): string {
  return JSON.stringify({ "@context": "https://schema.org", "@graph": nodes });
}
