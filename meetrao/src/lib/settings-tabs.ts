/**
 * Shared between the server page and the client sub-nav. It lives outside the
 * "use client" module on purpose: importing a plain value across that boundary
 * yields a client-reference proxy, not the array itself.
 */
export const SETTINGS_TABS = [
  { slug: "profile", label: "Profile" },
  { slug: "calendar", label: "Calendar" },
  { slug: "booking", label: "Booking" },
  { slug: "notifications", label: "Notifications" },
  { slug: "account", label: "Account" },
] as const;

export type SettingsTab = (typeof SETTINGS_TABS)[number]["slug"];
