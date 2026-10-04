/* The Settings panels, and their URLs.

   Not in settings-nav.tsx, which is a client component: the settings route
   validates the tab segment on the server, and a constant exported from a
   "use client" module is a client reference there, not an array. Reading it
   throws at request time.

   TWO SETS, because a workspace has its own settings. In a company you are
   editing that company's brand, its domain and its people; in Personal you
   are editing your own profile, calendar and account. Showing both lists at
   once would mean a Profile tab inside a company that is not the company's
   profile, and a Branding tab in Personal that edits something a company
   domain no longer serves.

   PLAN AND COMPANIES STAY PERSONAL. Billing is per ACCOUNT, not per company:
   one subscription covers every company somebody owns, so putting it inside
   one of them would suggest each is paid for separately. */

export const PERSONAL_TABS = [
  { key: "profile", label: "Profile" },
  { key: "calendar", label: "Calendar" },
  { key: "booking", label: "Booking" },
  { key: "billing", label: "Plan" },
  { key: "companies", label: "Companies" },
  { key: "team", label: "Team" },
  { key: "developer", label: "Developer" },
  { key: "notifications", label: "Notifications" },
  { key: "account", label: "Account" },
] as const;

/* Branding carries the domain with it, as it always has: the logo, the
   colours and the address are the one thing somebody sets up when they want
   their pages to look like theirs, and splitting them would make that two
   screens for one job. */
export const COMPANY_TABS = [
  { key: "branding", label: "Branding" },
  { key: "people", label: "People" },
] as const;

/** Every tab that exists, for validating a URL segment. */
export const SETTINGS_TABS = [...PERSONAL_TABS, ...COMPANY_TABS] as const;

export type SettingsTab = (typeof SETTINGS_TABS)[number]["key"];

export function tabsFor(companyId: string | null) {
  return companyId ? COMPANY_TABS : PERSONAL_TABS;
}

/** Where /settings lands, which differs by workspace. */
export function defaultTab(companyId: string | null): SettingsTab {
  return companyId ? "branding" : "profile";
}
