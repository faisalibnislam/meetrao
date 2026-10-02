import { createHash } from "node:crypto";

/* ─────────────────────────────────────────────────────────────────────────────
   Turning one request into one analytics row.

   Everything here is a narrowing: a user-agent string becomes a device class, a
   referrer URL becomes a bare hostname, an IP address becomes a hash that stops
   being useful tomorrow. Nothing widens. The point is that the row written to
   `site_visits` cannot be turned back into the request that produced it.

   Pure functions with no imports from the app, so `visit.test.ts` can hold them
   to real user-agent strings rather than to my recollection of them.
   ───────────────────────────────────────────────────────────────────────────── */

export type DeviceClass = "phone" | "tablet" | "desktop" | "unknown";

export type VisitClassification = {
  device: DeviceClass;
  /** Family only, "iOS", never "iOS 18.4". A version number is a fingerprint. */
  os: string | null;
  /** Family only, same reason. */
  browser: string | null;
  isBot: boolean;
};

/* Crawlers, previewers, uptime checks and scripts.
   Kept as a row (the table has an is_bot column) rather than dropped, so
   "visits tripled overnight" has an answer instead of a shrug.

   `(?<!cu)bot\b`, Cubot is an Android phone brand, and its UA ("CUBOT P40")
   would otherwise make every one of those phones a crawler. A false bot is
   quiet: the row is simply missing from every number on the screen.

   `duckduckbot` and not `duckduck`, because DuckDuckGo also ships a browser
   whose UA says "DuckDuckGo/5" and which is a person. */
const BOT =
  /(?<!cu)bot\b|bot\/|_bot|robot|spider|crawl|slurp|scrapy|searchbot|archiver|feedfetcher|facebookexternalhit|preview|unfurl|uptime|monitor|pingdom|statuscake|lighthouse|pagespeed|headless|phantomjs|curl\/|wget\/|python-requests|python-urllib|go-http-client|java\/|okhttp|axios\/|node-fetch|got \(|libwww|httpclient|postman|insomnia|whatsapp|telegram|discord|slack|vercel|prerender|embedly|proximic|dataprovider|semrush|ahrefs|mj12|dotbot|petal|gptbot|claude|anthropic|oai-searchbot|chatgpt|perplexity|ccbot|bytespider|amazonbot|applebot|duckduckbot|yandex|baidu|sogou|seznam|qwant|linkedin|pinterest|tumblr|nuzzel|skype|validator|zgrab|masscan|nmap/i;

/* A tablet is not a big phone: the layouts that break are the ones between the
   two, so the split has to be real.

   `ipad` first because iPad Safari's UA also contains "Mobile". Android's rule
   is the inverse of the phone rule. Google's own guidance is that an Android
   tablet omits "Mobile" from a UA that still says "Android". */
const TABLET = /ipad|android(?!.*\bmobile\b)|tablet|playbook|kindle|silk\/|nexus (?:7|9|10)|sm-t\d/i;
const PHONE =
  /\bmobile\b|iphone|ipod|windows phone|iemobile|blackberry|bb10|\bbada\b|opera mini|opera mobi|webos|palm|symbian|fennec/i;

/* Anything recognisably a browser engine. A UA matching none of these is not
   called "desktop". It is called unknown, because guessing desktop is how a
   table of devices ends up flattering the desktop. */
const BROWSER_ENGINE = /mozilla\/|applewebkit|gecko\/|khtml|opera|edge|chrome|safari|firefox|trident/i;

/**
 * What kind of thing made this request.
 *
 * `isBot` is decided first and independently: a crawler that says "iPhone" is
 * still a crawler, and its device class is not interesting, so it comes back
 * "unknown" rather than "phone".
 *
 * An absent or empty user-agent is a bot. Every real browser sends one; a
 * request without one is a script, and counting it as a mystery visitor is how
 * a traffic graph gets a floor it cannot explain.
 */
export function classifyUserAgent(userAgent: string | null | undefined): VisitClassification {
  const ua = (userAgent ?? "").trim();
  if (!ua) return { device: "unknown", os: null, browser: null, isBot: true };

  if (BOT.test(ua)) return { device: "unknown", os: null, browser: null, isBot: true };

  const device: DeviceClass = TABLET.test(ua)
    ? "tablet"
    : PHONE.test(ua)
      ? "phone"
      : BROWSER_ENGINE.test(ua)
        ? "desktop"
        : "unknown";

  return { device, os: osFamily(ua), browser: browserFamily(ua), isBot: false };
}

function osFamily(ua: string): string | null {
  // iPad before Macintosh: an iPad reports "CPU OS 17_4 like Mac OS X".
  //
  // iPadOS 13+ asking for a desktop site reports Macintosh outright and is
  // genuinely indistinguishable from a Mac. Nothing can be done about that from
  // a UA string, and a wrong "macOS" beats a confident wrong "iPadOS".
  if (/ipad/i.test(ua)) return "iPadOS";
  if (/iphone|ipod/i.test(ua)) return "iOS";
  if (/android/i.test(ua)) return "Android";
  if (/cros/i.test(ua)) return "ChromeOS";
  if (/windows phone/i.test(ua)) return "Windows Phone";
  if (/windows nt/i.test(ua)) return "Windows";
  if (/mac os x|macintosh/i.test(ua)) return "macOS";
  if (/linux|x11/i.test(ua)) return "Linux";
  return null;
}

function browserFamily(ua: string): string | null {
  // Order is the whole of this function. Every browser below Chrome also claims
  // to be Chrome, and every browser at all also claims Safari, so the specific
  // names have to be asked about first or everything comes back "Chrome".
  if (/\bedg(?:e|a|ios)?\//i.test(ua)) return "Edge";
  if (/\bopr\/|\bopera\b/i.test(ua)) return "Opera";
  if (/samsungbrowser/i.test(ua)) return "Samsung Internet";
  if (/\bvivaldi\b/i.test(ua)) return "Vivaldi";
  if (/\bbrave\b/i.test(ua)) return "Brave";
  if (/\bduckduckgo\//i.test(ua)) return "DuckDuckGo";
  // iOS: every browser is Safari's engine and says so. CriOS and FxiOS are the
  // only way Chrome and Firefox on an iPhone are visible at all.
  if (/crios\//i.test(ua)) return "Chrome";
  if (/fxios\//i.test(ua)) return "Firefox";
  if (/\bchrome\/|\bchromium\//i.test(ua)) return "Chrome";
  if (/\bfirefox\/|\bseamonkey\//i.test(ua)) return "Firefox";
  if (/\bsafari\//i.test(ua)) return "Safari";
  if (/\btrident\/|\bmsie\b/i.test(ua)) return "Internet Explorer";
  return null;
}

/**
 * The bare host a visitor arrived from, or null.
 *
 * Only the host: the path of the page someone came from is theirs, and
 * "google.com" already answers the question the operator is asking. `www.` is
 * stripped so google.com and www.google.com are one row rather than two.
 *
 * Our own host returns null rather than "meetrao.com". An in-site click is not
 * a referral, and counting it as one makes Meetrao its own biggest source.
 */
export function referrerHost(referrer: string | null | undefined, ownHost?: string | null): string | null {
  const raw = (referrer ?? "").trim();
  if (!raw) return null;

  let host: string;
  try {
    host = new URL(raw).hostname.toLowerCase();
  } catch {
    return null;
  }
  if (!host) return null;

  const bare = host.replace(/^www\./, "");
  const own = (ownHost ?? "").trim().toLowerCase().replace(/^www\./, "");
  if (own && bare === own) return null;

  return bare.slice(0, 120);
}

/**
 * The pathname, with everything after it removed.
 *
 * A booking link's query string can carry a guest's name (`?name=…`), so the
 * query is dropped here, not trimmed later, dropped before the stored value
 * exists. A path that does not start with "/" is refused outright: the beacon
 * posts this, and a beacon posts whatever a page tells it to.
 */
export function normalizePath(input: string | null | undefined): string | null {
  const raw = (input ?? "").trim();
  if (!raw.startsWith("/")) return null;
  // "//evil.example.com" is a protocol-relative URL, not a path.
  if (raw.startsWith("//")) return null;

  const path = raw.split(/[?#]/, 1)[0];
  const trimmed = path.length > 1 ? path.replace(/\/+$/, "") : path;
  return (trimmed || "/").slice(0, 200);
}

/**
 * The daily-rotating visitor pseudonym.
 *
 * sha256(salt · UTC date · ip · user-agent), truncated to 32 hex characters.
 *
 * Three properties, in the order they matter:
 *
 *  1. The IP never lands in a column. It is an argument here and nothing else,
 *     so there is no table to leak it from and no export that contains it.
 *  2. The salt is a server secret. Without one the hash is reversible by brute
 *     force. The IPv4 space is four billion values, which is minutes.
 *  3. The date is *inside* the hash, so the same visitor is a different value
 *     tomorrow. "How many people came today" is answerable; "is this the same
 *     person who came last week" is not, by construction.
 *
 * 128 bits is far more than is needed to avoid collisions within a day, and is
 * kept only because truncating further buys nothing.
 */
export function visitorHash(args: { salt: string; ip: string; userAgent: string; at?: Date }): string {
  const day = (args.at ?? new Date()).toISOString().slice(0, 10);
  const parts = [args.salt, day, args.ip, args.userAgent];
  // A separator that cannot occur in any part, so ("a", "bc") and ("ab", "c")
  // are different visitors rather than the same hash.
  return createHash("sha256").update(parts.join(" ")).digest("hex").slice(0, 32);
}

/**
 * The client address, from the proxy header Vercel sets.
 *
 * `x-forwarded-for` is a list: the client is the first entry and the rest are
 * proxies. Falls back to a constant rather than to "" so a request with no
 * header still produces one stable hash for the day, instead of one that
 * changes per page view and inflates the visitor count.
 */
export function clientAddress(headers: { get(name: string): string | null }): string {
  const forwarded = headers.get("x-forwarded-for");
  const first = forwarded?.split(",")[0]?.trim();
  if (first) return first;
  return headers.get("x-real-ip")?.trim() || "unknown";
}

/** Vercel's edge geo headers. Absent everywhere except a Vercel deployment. */
export function geoFromHeaders(headers: { get(name: string): string | null }): {
  country: string | null;
  region: string | null;
  city: string | null;
} {
  const clean = (value: string | null, limit: number) => {
    const trimmed = (value ?? "").trim();
    if (!trimmed) return null;
    // Vercel percent-encodes city names carrying non-ASCII characters.
    let decoded = trimmed;
    try {
      decoded = decodeURIComponent(trimmed);
    } catch {
      /* a stray % is not worth losing the row over */
    }
    return decoded.slice(0, limit) || null;
  };

  const country = clean(headers.get("x-vercel-ip-country"), 2);
  return {
    country: country ? country.toUpperCase() : null,
    region: clean(headers.get("x-vercel-ip-country-region"), 12),
    city: clean(headers.get("x-vercel-ip-city"), 80),
  };
}
