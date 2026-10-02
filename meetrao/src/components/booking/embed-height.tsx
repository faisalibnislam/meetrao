"use client";

import { useEffect } from "react";

/* ─────────────────────────────────────────────────────────────────────────────
   Tells the parent page how tall the widget is.

   An iframe does not size itself to its content, so without this the host
   picks a height and gets either a scrollbar inside their page or a slab of
   empty space under the calendar. The flow's height changes as the guest moves
   between picking a time and filling in details, which is exactly when a fixed
   height looks broken.

   The message is posted to "*" because we cannot know the embedding origin.
   A host puts this on their own site, and the whole point is that we did not
   have to be told where. That is safe in this direction: the payload is a
   number this page already renders, and nothing is read back. The snippet on
   the host's side checks `event.source` against its own iframe before
   believing it.
   ───────────────────────────────────────────────────────────────────────────── */

export function EmbedHeight() {
  useEffect(() => {
    if (window.parent === window) return;

    /* MEASURE THE CONTENT, NOT ANYTHING THAT FILLS THE FRAME.
       
       Inside an iframe the document, the body and any stretched wrapper are all
       as tall as the frame, so measuring one of those reports back the height
       the parent already set. A feedback loop that can grow and never shrink.
       It is a convincing loop, too: the number changes when the parent resizes,
       so it looks like it is working.
       
       The layout's child is the first element whose height is its own, which is
       why the layout pins it with items-start. */
    const frame = document.getElementById("mr-embed-root");
    const root = frame?.firstElementChild ?? document.documentElement;
    const padding = frame ? frame.getBoundingClientRect().height - root.getBoundingClientRect().height : 0;

    let last = 0;
    const post = () => {
      // Plus the layout's own padding, which is outside the measured child.
      const height = Math.ceil(root.getBoundingClientRect().height + Math.max(0, Math.min(padding, 48)));
      // Only on a real change, and never on a one-pixel rounding wobble: a
      // message per animation frame would be a message per scroll on some
      // browsers.
      if (Math.abs(height - last) < 2) return;
      last = height;
      window.parent.postMessage({ type: "meetrao:height", height }, "*");
    };

    post();
    const observer = new ResizeObserver(post);
    observer.observe(root);
    return () => observer.disconnect();
  }, []);

  return null;
}
