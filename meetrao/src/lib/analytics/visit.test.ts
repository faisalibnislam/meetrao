import { describe, expect, it } from "vitest";
import {
  classifyUserAgent,
  clientAddress,
  geoFromHeaders,
  normalizePath,
  referrerHost,
  visitorHash,
} from "./visit";

/* ─────────────────────────────────────────────────────────────────────────────
   Held to real user-agent strings, not to my recollection of them.

   Every string below is copied from an actual browser or crawler. That matters
   more here than in most tests, because UA sniffing fails in exactly one way —
   plausibly. "Android tablets are phones" and "every browser is Chrome" both
   produce a table that looks completely fine and is wrong, and neither shows up
   until someone acts on the numbers.
   ───────────────────────────────────────────────────────────────────────────── */

const UA = {
  chromeWindows:
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  safariMac:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Safari/605.1.15",
  firefoxLinux: "Mozilla/5.0 (X11; Linux x86_64; rv:133.0) Gecko/20100101 Firefox/133.0",
  edgeWindows:
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0",
  safariIphone:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1",
  chromeIphone:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/131.0.6778.73 Mobile/15E148 Safari/604.1",
  firefoxIphone:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) FxiOS/133.0 Mobile/15E148 Safari/605.1.15",
  safariIpad:
    "Mozilla/5.0 (iPad; CPU OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1",
  chromeAndroidPhone:
    "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
  chromeAndroidTablet:
    "Mozilla/5.0 (Linux; Android 13; SM-X700) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  samsungPhone:
    "Mozilla/5.0 (Linux; Android 13; SAMSUNG SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/23.0 Chrome/115.0.0.0 Mobile Safari/537.36",
  operaWindows:
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 OPR/115.0.0.0",
  /* Cubot is an Android phone brand. Its UA contains the letters "bot". */
  cubotPhone:
    "Mozilla/5.0 (Linux; Android 11; CUBOT NOTE 20) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/94.0.4606.85 Mobile Safari/537.36",

  googlebot: "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
  bingbot: "Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)",
  gptbot: "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; GPTBot/1.2; +https://openai.com/gptbot",
  facebook: "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)",
  slackbot: "Slackbot-LinkExpanding 1.0 (+https://api.slack.com/robots)",
  curl: "curl/8.7.1",
  headless:
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/131.0.0.0 Safari/537.36",
  uptime: "Better Uptime Bot Mozilla/5.0 (compatible)",
};

describe("classifyUserAgent · device", () => {
  const cases: [string, string, "phone" | "tablet" | "desktop" | "unknown"][] = [
    ["Chrome on Windows", UA.chromeWindows, "desktop"],
    ["Safari on a Mac", UA.safariMac, "desktop"],
    ["Firefox on Linux", UA.firefoxLinux, "desktop"],
    ["Edge on Windows", UA.edgeWindows, "desktop"],
    ["Opera on Windows", UA.operaWindows, "desktop"],
    ["Safari on an iPhone", UA.safariIphone, "phone"],
    ["Chrome on an iPhone", UA.chromeIphone, "phone"],
    ["Chrome on an Android phone", UA.chromeAndroidPhone, "phone"],
    ["Samsung Internet on a phone", UA.samsungPhone, "phone"],
    ["a Cubot phone", UA.cubotPhone, "phone"],
    ["Safari on an iPad", UA.safariIpad, "tablet"],
    ["Chrome on an Android tablet", UA.chromeAndroidTablet, "tablet"],
  ];

  for (const [label, ua, device] of cases) {
    it(`${label} is a ${device}`, () => {
      expect(classifyUserAgent(ua).device).toBe(device);
      expect(classifyUserAgent(ua).isBot).toBe(false);
    });
  }

  /* The one that is easy to get wrong: an Android tablet's UA is an Android
     phone's UA minus the word "Mobile". A width breakpoint would call both the
     same thing, and the layouts that break live between the two. */
  it("separates an Android tablet from an Android phone", () => {
    expect(classifyUserAgent(UA.chromeAndroidPhone).device).toBe("phone");
    expect(classifyUserAgent(UA.chromeAndroidTablet).device).toBe("tablet");
  });
});

describe("classifyUserAgent · os and browser", () => {
  const cases: [string, string, string][] = [
    [UA.chromeWindows, "Windows", "Chrome"],
    [UA.safariMac, "macOS", "Safari"],
    [UA.firefoxLinux, "Linux", "Firefox"],
    [UA.edgeWindows, "Windows", "Edge"],
    [UA.operaWindows, "Windows", "Opera"],
    [UA.safariIphone, "iOS", "Safari"],
    [UA.chromeIphone, "iOS", "Chrome"],
    [UA.firefoxIphone, "iOS", "Firefox"],
    [UA.safariIpad, "iPadOS", "Safari"],
    [UA.chromeAndroidPhone, "Android", "Chrome"],
    [UA.samsungPhone, "Android", "Samsung Internet"],
  ];

  for (const [ua, os, browser] of cases) {
    it(`reads ${os} · ${browser}`, () => {
      const got = classifyUserAgent(ua);
      expect(got.os).toBe(os);
      expect(got.browser).toBe(browser);
    });
  }

  /* Every one of these also says "Chrome", and every one also says "Safari".
     Asking in the wrong order makes the browser table say Chrome for all of
     them — which is a table that looks entirely reasonable. */
  it("does not collapse Chrome-derived browsers into Chrome", () => {
    const families = [UA.edgeWindows, UA.operaWindows, UA.samsungPhone].map((ua) => classifyUserAgent(ua).browser);
    expect(families).toEqual(["Edge", "Opera", "Samsung Internet"]);
  });

  it("does not collapse iOS browsers into Safari", () => {
    expect(classifyUserAgent(UA.chromeIphone).browser).toBe("Chrome");
    expect(classifyUserAgent(UA.firefoxIphone).browser).toBe("Firefox");
    expect(classifyUserAgent(UA.safariIphone).browser).toBe("Safari");
  });

  it("reports a family, never a version", () => {
    for (const ua of Object.values(UA)) {
      const { os, browser } = classifyUserAgent(ua);
      expect(os ?? "").not.toMatch(/\d/);
      expect(browser ?? "").not.toMatch(/\d/);
    }
  });
});

describe("classifyUserAgent · bots", () => {
  const bots: [string, string][] = [
    ["Googlebot", UA.googlebot],
    ["bingbot", UA.bingbot],
    ["GPTBot", UA.gptbot],
    ["Facebook's link unfurler", UA.facebook],
    ["Slackbot", UA.slackbot],
    ["curl", UA.curl],
    ["headless Chrome", UA.headless],
    ["an uptime checker", UA.uptime],
  ];

  for (const [label, ua] of bots) {
    it(`${label} is a bot`, () => {
      expect(classifyUserAgent(ua).isBot).toBe(true);
    });
  }

  it("treats a missing user-agent as a bot, not a mystery visitor", () => {
    for (const ua of ["", "   ", null, undefined]) {
      expect(classifyUserAgent(ua).isBot).toBe(true);
    }
  });

  it("does not give a bot a device class", () => {
    expect(classifyUserAgent(UA.googlebot)).toEqual({
      device: "unknown",
      os: null,
      browser: null,
      isBot: true,
    });
  });

  it("calls no real browser a bot", () => {
    const real = [
      UA.chromeWindows, UA.safariMac, UA.firefoxLinux, UA.edgeWindows, UA.operaWindows,
      UA.safariIphone, UA.chromeIphone, UA.firefoxIphone, UA.safariIpad,
      UA.chromeAndroidPhone, UA.chromeAndroidTablet, UA.samsungPhone, UA.cubotPhone,
    ];
    expect(real.filter((ua) => classifyUserAgent(ua).isBot)).toEqual([]);
  });
});

describe("referrerHost", () => {
  it("keeps the host and nothing else", () => {
    expect(referrerHost("https://news.ycombinator.com/item?id=123")).toBe("news.ycombinator.com");
  });

  it("folds www. into the bare host", () => {
    expect(referrerHost("https://www.google.com/search?q=meetrao")).toBe("google.com");
    expect(referrerHost("https://google.com/")).toBe("google.com");
  });

  it("drops our own host: an in-site click is not a referral", () => {
    expect(referrerHost("https://meetrao.com/privacy", "meetrao.com")).toBeNull();
    expect(referrerHost("https://www.meetrao.com/privacy", "meetrao.com")).toBeNull();
    expect(referrerHost("https://meetrao.com/privacy", "www.meetrao.com")).toBeNull();
  });

  it("is null for a direct visit or an unparseable referrer", () => {
    for (const input of ["", "  ", null, undefined, "not a url", "/relative"]) {
      expect(referrerHost(input)).toBeNull();
    }
  });

  it("never stores the path of the page someone came from", () => {
    const host = referrerHost("https://mail.google.com/mail/u/0/#inbox/FMfcgz");
    expect(host).toBe("mail.google.com");
    expect(host).not.toContain("/");
  });
});

describe("normalizePath", () => {
  it("keeps a plain path", () => {
    expect(normalizePath("/privacy")).toBe("/privacy");
    expect(normalizePath("/")).toBe("/");
  });

  /* A booking link's query can carry a guest's name. This is where that stops. */
  it("drops the query string and the fragment", () => {
    expect(normalizePath("/adam/30-min?name=Jane%20Doe&email=jane@x.com")).toBe("/adam/30-min");
    expect(normalizePath("/help#calendar")).toBe("/help");
  });

  it("folds a trailing slash, but leaves the root alone", () => {
    expect(normalizePath("/terms/")).toBe("/terms");
    expect(normalizePath("/")).toBe("/");
  });

  it("refuses anything that is not a path", () => {
    for (const input of ["", "  ", null, undefined, "https://evil.example.com/", "javascript:alert(1)", "terms"]) {
      expect(normalizePath(input)).toBeNull();
    }
  });

  /* The beacon posts this value, and a beacon posts whatever a page tells it
     to. "//host" is a protocol-relative URL wearing a path's clothes. */
  it("refuses a protocol-relative URL", () => {
    expect(normalizePath("//evil.example.com/steal")).toBeNull();
  });

  it("caps the length", () => {
    expect(normalizePath("/" + "a".repeat(400))?.length).toBe(200);
  });
});

describe("visitorHash", () => {
  const base = { salt: "s3cret", ip: "203.0.113.7", userAgent: UA.safariIphone, at: new Date("2026-09-12T10:00:00Z") };

  it("is stable within a day", () => {
    const later = { ...base, at: new Date("2026-09-12T23:59:59Z") };
    expect(visitorHash(base)).toBe(visitorHash(later));
  });

  /* The whole privacy argument rests on this one. If the hash survived midnight
     it would be a stable pseudonym, and a stable pseudonym is tracking. */
  it("changes at UTC midnight", () => {
    const tomorrow = { ...base, at: new Date("2026-09-13T00:00:01Z") };
    expect(visitorHash(tomorrow)).not.toBe(visitorHash(base));
  });

  it("separates two visitors on one day", () => {
    expect(visitorHash({ ...base, ip: "203.0.113.8" })).not.toBe(visitorHash(base));
    expect(visitorHash({ ...base, userAgent: UA.chromeWindows })).not.toBe(visitorHash(base));
  });

  /* Without the salt the hash is a lookup table: four billion IPv4 addresses is
     minutes of work. A different salt has to give a different answer. */
  it("depends on the salt", () => {
    expect(visitorHash({ ...base, salt: "other" })).not.toBe(visitorHash(base));
  });

  it("cannot be confused by moving a character between fields", () => {
    const a = visitorHash({ salt: "ab", ip: "c", userAgent: "d", at: base.at });
    const b = visitorHash({ salt: "a", ip: "bc", userAgent: "d", at: base.at });
    expect(a).not.toBe(b);
  });

  it("is 32 hex characters and contains no input", () => {
    const hash = visitorHash(base);
    expect(hash).toMatch(/^[0-9a-f]{32}$/);
    expect(hash).not.toContain("203.0.113.7");
  });
});

const headers = (map: Record<string, string>) => ({ get: (name: string) => map[name.toLowerCase()] ?? null });

describe("clientAddress", () => {
  it("takes the client, not the proxy, from x-forwarded-for", () => {
    expect(clientAddress(headers({ "x-forwarded-for": "203.0.113.7, 70.41.3.18, 150.172.238.178" }))).toBe(
      "203.0.113.7",
    );
  });

  it("falls back to x-real-ip, then to a constant", () => {
    expect(clientAddress(headers({ "x-real-ip": "198.51.100.4" }))).toBe("198.51.100.4");
    expect(clientAddress(headers({}))).toBe("unknown");
  });

  /* A per-request fallback (a random value, or "") would make one visitor look
     like a hundred, because the hash is what "unique" means here. */
  it("falls back to something stable", () => {
    expect(clientAddress(headers({}))).toBe(clientAddress(headers({})));
  });
});

describe("geoFromHeaders", () => {
  it("reads Vercel's edge headers", () => {
    expect(
      geoFromHeaders(
        headers({
          "x-vercel-ip-country": "bd",
          "x-vercel-ip-country-region": "C",
          "x-vercel-ip-city": "Cumilla",
        }),
      ),
    ).toEqual({ country: "BD", region: "C", city: "Cumilla" });
  });

  it("decodes a percent-encoded city", () => {
    expect(geoFromHeaders(headers({ "x-vercel-ip-city": "S%C3%A3o%20Paulo" })).city).toBe("São Paulo");
  });

  it("survives a malformed encoding rather than losing the row", () => {
    expect(geoFromHeaders(headers({ "x-vercel-ip-city": "100%" })).city).toBe("100%");
  });

  it("is all null off Vercel, where the headers do not exist", () => {
    expect(geoFromHeaders(headers({}))).toEqual({ country: null, region: null, city: null });
  });
});
