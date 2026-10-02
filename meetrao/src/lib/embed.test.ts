import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { embedSnippet, embedUrl } from "./embed";

const OPTIONS = { siteUrl: "https://meetrao.com/", username: "adam", slug: "30-minute-consultation" };

describe("the embed url", () => {
  it("drops a trailing slash and escapes both parts", () => {
    expect(embedUrl(OPTIONS)).toBe("https://meetrao.com/embed/adam/30-minute-consultation");
    expect(embedUrl({ ...OPTIONS, username: "a b" })).toContain("/embed/a%20b/");
  });
});

describe("the snippet a host pastes", () => {
  const snippet = embedSnippet(OPTIONS);

  it("carries the iframe and the resize listener", () => {
    expect(snippet).toContain('src="https://meetrao.com/embed/adam/30-minute-consultation"');
    expect(snippet).toContain("meetrao:height");
  });

  /* Two checks, because a page can hold several widgets and any other frame on
     it can post a message. Without the first, the last widget to load wins;
     without the second, anything on the page can resize ours. */
  it("believes only its own iframe", () => {
    expect(snippet).toContain("event.source !== frame.contentWindow");
    expect(snippet).toContain('event.data.type !== "meetrao:height"');
  });

  it("fetches nothing from us to work", () => {
    // A hosted loader would make every embedding page depend on our uptime for
    // something they could paste once.
    expect(snippet).not.toMatch(/<script src=/);
  });

  it("starts at a height and lets the widget correct it", () => {
    expect(embedSnippet({ ...OPTIONS, height: 500 })).toContain("height:500px");
  });
});

describe("framing", () => {
  const config = readFileSync(path.join(process.cwd(), "next.config.ts"), "utf8");

  it("guards the guard", () => {
    expect(config, "the headers block has gone").toContain("frame-ancestors");
  });

  /* Before the widget there was no policy at all, which meant the dashboard,
     the settings page and the sign-in form could each be framed invisibly on
     someone else's site. The widget is the one exception and has to stay the
     only one. */
  it("allows the widget and denies everything else", () => {
    expect(config).toMatch(/source:\s*"\/embed\/:path\*"/);
    expect(config).toContain("frame-ancestors *");
    expect(config).toMatch(/source:\s*"\/\(\(\?!embed\)\.\*\)"/);
    expect(config).toContain("frame-ancestors 'none'");
    expect(config).toContain("X-Frame-Options");
  });
});

describe("what the widget measures", () => {
  const height = readFileSync(path.join(process.cwd(), "src/components/booking/embed-height.tsx"), "utf8");
  const layout = readFileSync(path.join(process.cwd(), "src/app/embed/layout.tsx"), "utf8");

  /* Measuring the document, the body or any stretched wrapper reports back the
     height the parent already set, a loop that grows and never shrinks, and
     one that looks like it works because the number does change. */
  it("measures the content, not the frame", () => {
    expect(height).toContain("firstElementChild");
    expect(height).not.toContain("document.documentElement.scrollHeight");
  });

  it("keeps the child at its own height", () => {
    expect(layout, "items-start is what makes the child measurable").toContain("items-start");
  });
});
