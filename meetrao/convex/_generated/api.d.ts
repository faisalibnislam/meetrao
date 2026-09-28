/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as admin from "../admin.js";
import type * as analytics from "../analytics.js";
import type * as auth from "../auth.js";
import type * as authCrypto from "../authCrypto.js";
import type * as authImport from "../authImport.js";
import type * as availability from "../availability.js";
import type * as avatars from "../avatars.js";
import type * as bookings from "../bookings.js";
import type * as calendarConnections from "../calendarConnections.js";
import type * as contacts from "../contacts.js";
import type * as crons from "../crons.js";
import type * as google from "../google.js";
import type * as http from "../http.js";
import type * as lib_auth from "../lib/auth.js";
import type * as lib_effects from "../lib/effects.js";
import type * as lib_emails from "../lib/emails.js";
import type * as lib_errors from "../lib/errors.js";
import type * as lib_googleApi from "../lib/googleApi.js";
import type * as lib_ids from "../lib/ids.js";
import type * as lib_locations from "../lib/locations.js";
import type * as lib_rateLimit from "../lib/rateLimit.js";
import type * as lib_reminderEmail from "../lib/reminderEmail.js";
import type * as lib_reminderWindow from "../lib/reminderWindow.js";
import type * as lib_serialize from "../lib/serialize.js";
import type * as lib_zoned from "../lib/zoned.js";
import type * as lib_zones from "../lib/zones.js";
import type * as maintenance from "../maintenance.js";
import type * as meetingTypes from "../meetingTypes.js";
import type * as notifications from "../notifications.js";
import type * as platformSettings from "../platformSettings.js";
import type * as profiles from "../profiles.js";
import type * as publicBooking from "../publicBooking.js";
import type * as reminders from "../reminders.js";
import type * as rsvp from "../rsvp.js";
import type * as testCleanup from "../testCleanup.js";
import type * as verify from "../verify.js";
import type * as whoami from "../whoami.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  admin: typeof admin;
  analytics: typeof analytics;
  auth: typeof auth;
  authCrypto: typeof authCrypto;
  authImport: typeof authImport;
  availability: typeof availability;
  avatars: typeof avatars;
  bookings: typeof bookings;
  calendarConnections: typeof calendarConnections;
  contacts: typeof contacts;
  crons: typeof crons;
  google: typeof google;
  http: typeof http;
  "lib/auth": typeof lib_auth;
  "lib/effects": typeof lib_effects;
  "lib/emails": typeof lib_emails;
  "lib/errors": typeof lib_errors;
  "lib/googleApi": typeof lib_googleApi;
  "lib/ids": typeof lib_ids;
  "lib/locations": typeof lib_locations;
  "lib/rateLimit": typeof lib_rateLimit;
  "lib/reminderEmail": typeof lib_reminderEmail;
  "lib/reminderWindow": typeof lib_reminderWindow;
  "lib/serialize": typeof lib_serialize;
  "lib/zoned": typeof lib_zoned;
  "lib/zones": typeof lib_zones;
  maintenance: typeof maintenance;
  meetingTypes: typeof meetingTypes;
  notifications: typeof notifications;
  platformSettings: typeof platformSettings;
  profiles: typeof profiles;
  publicBooking: typeof publicBooking;
  reminders: typeof reminders;
  rsvp: typeof rsvp;
  testCleanup: typeof testCleanup;
  verify: typeof verify;
  whoami: typeof whoami;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
