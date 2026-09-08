/* The five Settings panels, and their URLs.

   Not in settings-nav.tsx, which is a client component: the settings route
   validates the tab segment on the server, and a constant exported from a
   "use client" module is a client reference there, not an array. Reading it
   throws at request time. */

export const SETTINGS_TABS = [
  { key: "profile", label: "Profile" },
  { key: "calendar", label: "Calendar" },
  { key: "booking", label: "Booking" },
  { key: "notifications", label: "Notifications" },
  { key: "account", label: "Account" },
] as const;

export type SettingsTab = (typeof SETTINGS_TABS)[number]["key"];
