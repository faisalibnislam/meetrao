/**
 * Whether /preview is served without a session.
 *
 * The gallery is an inventory of the product's internals, every component,
 * every state, the token table. That is exactly what a developer wants and
 * exactly what production should not hand to a stranger.
 *
 * Open in `next dev` and on Vercel preview deployments. On production it is
 * closed here and the page falls back to an admin check, so the one person
 * entitled to see it can, from any device, without running anything locally.
 */
export function previewEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  if (env.VERCEL_ENV === "production") return false;
  return env.NODE_ENV !== "production" || env.VERCEL_ENV === "preview";
}
