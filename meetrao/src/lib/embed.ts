/* ─────────────────────────────────────────────────────────────────────────────
   The snippet a host pastes into their own site.

   Plain HTML with one small script, not a hosted loader: a loader would mean
   every embedding page fetching JavaScript from us on every visit, which is a
   dependency they did not ask for and an outage they cannot fix. What is below
   keeps working if meetrao.com is slow. The iframe is just late.

   Neither "use client" nor "server-only": the meetings screen renders it in the
   browser and the tests read it in node. See src/lib/availability.ts for why
   that rule exists.
   ───────────────────────────────────────────────────────────────────────────── */

export type EmbedOptions = {
  siteUrl: string;
  username: string;
  slug: string;
  /** Starting height, before the widget reports its own. */
  height?: number;
};

export function embedUrl({ siteUrl, username, slug }: EmbedOptions): string {
  return `${siteUrl.replace(/\/$/, "")}/embed/${encodeURIComponent(username)}/${encodeURIComponent(slug)}`;
}

/**
 * The listener checks two things before resizing: that the message came from
 * this iframe, and that it is ours. A page with several widgets on it would
 * otherwise resize whichever one loaded last, and any other frame on the page
 * could resize ours.
 */
export function embedSnippet(options: EmbedOptions): string {
  const url = embedUrl(options);
  const height = options.height ?? 720;

  return `<iframe
  src="${url}"
  title="Book a meeting"
  loading="lazy"
  style="width:100%;max-width:960px;height:${height}px;border:0;display:block;margin:0 auto"
></iframe>
<script>
  window.addEventListener("message", function (event) {
    var frame = document.querySelector('iframe[src^="${url}"]');
    if (!frame || event.source !== frame.contentWindow) return;
    if (!event.data || event.data.type !== "meetrao:height") return;
    frame.style.height = event.data.height + "px";
  });
</script>`;
}
