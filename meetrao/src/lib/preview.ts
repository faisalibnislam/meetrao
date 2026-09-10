/**
 * Whether /preview is served.
 *
 * The gallery is an inventory of the product's internals — every component,
 * every state, the token table. That is exactly what a developer wants and
 * exactly what production should not hand to a stranger.
 *
 * Enabled in `next dev`, and on Vercel preview deployments so a branch build can
 * be shared and looked at. Never on production, whatever else is set.
 */
export function previewEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  if (env.VERCEL_ENV === "production") return false;
  return env.NODE_ENV !== "production" || env.VERCEL_ENV === "preview";
}
