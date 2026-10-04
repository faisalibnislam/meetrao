export type Profile = {
  id: string;
  username: string;
  full_name: string;
  job_title: string;
  email: string;
  timezone: string;
  avatar_url: string | null;
  is_admin: boolean;
  is_suspended: boolean;
  default_duration_minutes: number;
  default_notice_minutes: number;
  notify_new_booking: boolean;
  notify_booking_changed: boolean;
  notify_booking_cancelled: boolean;
  /** Absent on every profile written before reminders existed, and absent
      reads as on, the server applies the same rule. */
  notify_reminders?: boolean;
  /** When the two reminders go out, in minutes before the start. Absent is
      the free schedule: a day and an hour. */
  reminder_long_minutes?: number;
  reminder_short_minutes?: number;
  notify_daily_agenda: boolean;
  notify_product_news: boolean;
  onboarding_completed_at: string | null;
  created_at: string;
};

/** One question a meeting asks its guests, besides name, email and the note. */
export type BookingQuestion = {
  id: string;
  label: string;
  kind: "short" | "long";
  required: boolean;
};

/** A guest's answer, carrying the label it was asked under: a host rewording
    a question must not rewrite what a past guest was asked. */
export type BookingAnswer = { label: string; value: string };

export type MeetingType = {
  id: string;
  user_id: string;
  name: string;
  description: string;
  slug: string;
  duration_minutes: number;
  buffer_minutes: number;
  minimum_notice_minutes: number;
  booking_window_days: number;
  location: string;
  location_detail?: string;
  capacity?: number;
  is_active: boolean;
  /** null = the host's default schedule. See migration 0010. */
  schedule_id: string | null;
  /** Which company this meeting belongs to; null or absent is personal. */
  company_id?: string | null;
  /** The team link this meeting is handed to, if any. */
  team_id?: string | null;
  questions?: BookingQuestion[];
  created_at: string;
};

/** A named set of weekly hours. A host has at least one, exactly one default. */
export type AvailabilitySchedule = {
  id: string;
  user_id: string;
  name: string;
  is_default: boolean;
  created_at: string;
};

export type AvailabilityRule = {
  id: string;
  user_id: string;
  schedule_id: string;
  weekday: number;
  start_minute: number;
  end_minute: number;
};

export type BookingStatus = "confirmed" | "cancelled";

export type Booking = {
  id: string;
  reference: string;
  host_id: string;
  meeting_type_id: string | null;
  meeting_name: string;
  duration_minutes: number;
  guest_name: string;
  guest_email: string;
  guest_note: string;
  guest_timezone: string | null;
  starts_at: string;
  ends_at: string;
  status: BookingStatus;
  cancelled_at: string | null;
  cancelled_by: "host" | "guest" | null;
  google_event_id: string | null;
  meet_url: string | null;
  guest_rsvp: string | null;
  /** Absent on every booking made before a meeting could ask questions. */
  answers?: BookingAnswer[];
  /** Where it happens, as it was when the booking was made. */
  location?: string;
  location_detail?: string;
  created_at: string;
};

export type CalendarConnection = {
  id: string;
  user_id: string;
  google_account_email: string | null;
  calendar_id: string;
  access_token: string | null;
  refresh_token: string | null;
  token_expires_at: string | null;
  scopes: string[];
  needs_reconnect: boolean;
  last_error: string | null;
};

export type PlatformSettings = {
  id: boolean;
  app_name: string;
  support_email: string;
};

/** The five notification preferences, as the settings panel names them. */
export const NOTIFICATION_KEYS = [
  "notify_new_booking",
  "notify_booking_changed",
  "notify_booking_cancelled",
  "notify_reminders",
  "notify_daily_agenda",
  "notify_product_news",
] as const;

export type NotificationKey = (typeof NOTIFICATION_KEYS)[number];

/** A person the host has met, or expects to. Email is the identity. */
export type Contact = {
  id: string;
  user_id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  notes: string;
  source: "manual" | "booking" | "import";
  created_at: string;
  updated_at: string;
};
