/* ─────────────────────────────────────────────────────────────────────────────
   Copying, and knowing whether it worked.

   THE DEFECT THIS REPLACES was written six different times:

       await navigator.clipboard?.writeText(value).catch(() => {});
       toast({ tone: "ok", title: "Copied" });

   Two ways to lie in one line. If `navigator.clipboard` is undefined the
   optional chain short-circuits the WHOLE expression, including the `.catch`,
   so nothing is copied and nothing throws. If it exists and rejects, the
   `.catch` swallows it. Either way the next line says "Copied" and the
   clipboard still holds whatever it held before, which is the one failure a
   person cannot see until they paste somewhere else and get the wrong thing.

   `navigator.clipboard` is absent more often than it looks: any page served
   without TLS, and any iframe whose parent has not granted `clipboard-write`,
   which includes an embedded webview.

   SO THIS RETURNS WHETHER IT WORKED, and the fallback is a real one. A
   temporary textarea plus `document.execCommand("copy")` is deprecated and
   still the only thing that works where the async API is not allowed, which
   is exactly when a fallback is needed.
   ───────────────────────────────────────────────────────────────────────────── */

/** Copies text, and says whether the clipboard actually changed. */
export async function copyText(value: string): Promise<boolean> {
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(value);
      return true;
    } catch {
      // Falls through: a rejection here is usually a permissions policy, and
      // the old API is frequently still allowed in the same place.
    }
  }

  return legacyCopy(value);
}

/**
 * The deprecated path, for where the modern one is not permitted.
 *
 * Off-screen rather than hidden: `display: none` and `visibility: hidden`
 * elements cannot be selected, so the copy silently does nothing, which is
 * the bug this whole file exists to stop.
 */
function legacyCopy(value: string): boolean {
  if (typeof document === "undefined") return false;

  const area = document.createElement("textarea");
  area.value = value;
  area.setAttribute("readonly", "");
  area.setAttribute("aria-hidden", "true");
  area.style.position = "fixed";
  area.style.top = "-9999px";
  area.style.left = "-9999px";
  area.style.opacity = "0";

  document.body.appendChild(area);
  try {
    /* The caret is restored afterwards: copying from a rail must not take the
       cursor out of whatever somebody was typing. */
    const previous = document.activeElement as HTMLElement | null;
    area.select();
    area.setSelectionRange(0, value.length);
    const ok = document.execCommand("copy");
    previous?.focus?.();
    return ok;
  } catch {
    return false;
  } finally {
    document.body.removeChild(area);
  }
}
