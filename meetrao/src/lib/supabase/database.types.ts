/**
 * Generated from the live schema. Do not edit by hand — regenerate with:
 *
 *   npx supabase gen types typescript --project-id <ref> > src/lib/supabase/database.types.ts
 *
 * Domain-level aliases live in ./types.ts so they survive regeneration.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      admin_activity: {
        Row: {
          actor_id: string | null;
          created_at: string;
          id: string;
          kind: string;
          summary: string;
        };
        Insert: {
          actor_id?: string | null;
          created_at?: string;
          id?: string;
          kind: string;
          summary: string;
        };
        Update: {
          actor_id?: string | null;
          created_at?: string;
          id?: string;
          kind?: string;
          summary?: string;
        };
        Relationships: [];
      };
      availability_rules: {
        Row: {
          created_at: string;
          end_minute: number;
          id: string;
          start_minute: number;
          user_id: string;
          weekday: number;
        };
        Insert: {
          created_at?: string;
          end_minute: number;
          id?: string;
          start_minute: number;
          user_id: string;
          weekday: number;
        };
        Update: {
          created_at?: string;
          end_minute?: number;
          id?: string;
          start_minute?: number;
          user_id?: string;
          weekday?: number;
        };
        Relationships: [];
      };
      bookings: {
        Row: {
          cancelled_at: string | null;
          cancelled_by: Database["public"]["Enums"]["cancelled_by"] | null;
          created_at: string;
          duration_minutes: number;
          ends_at: string;
          google_event_id: string | null;
          guest_email: string;
          guest_name: string;
          guest_note: string;
          guest_rsvp: string | null;
          guest_rsvp_notified_at: string | null;
          guest_rsvp_synced_at: string | null;
          guest_timezone: string | null;
          host_id: string;
          id: string;
          meet_url: string | null;
          meeting_name: string;
          meeting_type_id: string | null;
          reference: string;
          starts_at: string;
          status: Database["public"]["Enums"]["booking_status"];
          updated_at: string;
        };
        Insert: {
          cancelled_at?: string | null;
          cancelled_by?: Database["public"]["Enums"]["cancelled_by"] | null;
          created_at?: string;
          duration_minutes: number;
          ends_at: string;
          google_event_id?: string | null;
          guest_email: string;
          guest_name: string;
          guest_note?: string;
          guest_rsvp?: string | null;
          guest_rsvp_notified_at?: string | null;
          guest_rsvp_synced_at?: string | null;
          guest_timezone?: string | null;
          host_id: string;
          id?: string;
          meet_url?: string | null;
          meeting_name: string;
          meeting_type_id?: string | null;
          reference?: string;
          starts_at: string;
          status?: Database["public"]["Enums"]["booking_status"];
          updated_at?: string;
        };
        Update: {
          cancelled_at?: string | null;
          cancelled_by?: Database["public"]["Enums"]["cancelled_by"] | null;
          created_at?: string;
          duration_minutes?: number;
          ends_at?: string;
          google_event_id?: string | null;
          guest_email?: string;
          guest_name?: string;
          guest_note?: string;
          guest_rsvp?: string | null;
          guest_rsvp_notified_at?: string | null;
          guest_rsvp_synced_at?: string | null;
          guest_timezone?: string | null;
          host_id?: string;
          id?: string;
          meet_url?: string | null;
          meeting_name?: string;
          meeting_type_id?: string | null;
          reference?: string;
          starts_at?: string;
          status?: Database["public"]["Enums"]["booking_status"];
          updated_at?: string;
        };
        Relationships: [];
      };
      bootstrap_admins: {
        Row: {
          created_at: string;
          email: string;
          note: string;
        };
        Insert: {
          created_at?: string;
          email: string;
          note?: string;
        };
        Update: {
          created_at?: string;
          email?: string;
          note?: string;
        };
        Relationships: [];
      };
      calendar_connections: {
        Row: {
          access_token: string | null;
          calendar_id: string;
          created_at: string;
          google_account_email: string | null;
          id: string;
          last_error: string | null;
          last_error_at: string | null;
          needs_reconnect: boolean;
          provider: string;
          refresh_token: string | null;
          scopes: string[];
          token_expires_at: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          access_token?: string | null;
          calendar_id?: string;
          created_at?: string;
          google_account_email?: string | null;
          id?: string;
          last_error?: string | null;
          last_error_at?: string | null;
          needs_reconnect?: boolean;
          provider?: string;
          refresh_token?: string | null;
          scopes?: string[];
          token_expires_at?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          access_token?: string | null;
          calendar_id?: string;
          created_at?: string;
          google_account_email?: string | null;
          id?: string;
          last_error?: string | null;
          last_error_at?: string | null;
          needs_reconnect?: boolean;
          provider?: string;
          refresh_token?: string | null;
          scopes?: string[];
          token_expires_at?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      meeting_types: {
        Row: {
          booking_window_days: number;
          buffer_minutes: number;
          created_at: string;
          description: string;
          duration_minutes: number;
          id: string;
          is_active: boolean;
          location: string;
          minimum_notice_minutes: number;
          name: string;
          slug: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          booking_window_days?: number;
          buffer_minutes?: number;
          created_at?: string;
          description?: string;
          duration_minutes?: number;
          id?: string;
          is_active?: boolean;
          location?: string;
          minimum_notice_minutes?: number;
          name: string;
          slug: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          booking_window_days?: number;
          buffer_minutes?: number;
          created_at?: string;
          description?: string;
          duration_minutes?: number;
          id?: string;
          is_active?: boolean;
          location?: string;
          minimum_notice_minutes?: number;
          name?: string;
          slug?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      platform_settings: {
        Row: {
          app_name: string;
          id: boolean;
          support_email: string;
          updated_at: string;
        };
        Insert: {
          app_name?: string;
          id?: boolean;
          support_email?: string;
          updated_at?: string;
        };
        Update: {
          app_name?: string;
          id?: boolean;
          support_email?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          created_at: string;
          default_duration_minutes: number;
          default_notice_minutes: number;
          email: string;
          full_name: string;
          id: string;
          is_admin: boolean;
          is_suspended: boolean;
          job_title: string;
          notify_booking_cancelled: boolean;
          notify_booking_changed: boolean;
          notify_daily_agenda: boolean;
          notify_new_booking: boolean;
          notify_product_news: boolean;
          onboarding_completed_at: string | null;
          timezone: string;
          updated_at: string;
          username: string;
        };
        Insert: {
          avatar_url?: string | null;
          created_at?: string;
          default_duration_minutes?: number;
          default_notice_minutes?: number;
          email?: string;
          full_name?: string;
          id: string;
          is_admin?: boolean;
          is_suspended?: boolean;
          job_title?: string;
          notify_booking_cancelled?: boolean;
          notify_booking_changed?: boolean;
          notify_daily_agenda?: boolean;
          notify_new_booking?: boolean;
          notify_product_news?: boolean;
          onboarding_completed_at?: string | null;
          timezone?: string;
          updated_at?: string;
          username: string;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string;
          default_duration_minutes?: number;
          default_notice_minutes?: number;
          email?: string;
          full_name?: string;
          id?: string;
          is_admin?: boolean;
          is_suspended?: boolean;
          job_title?: string;
          notify_booking_cancelled?: boolean;
          notify_booking_changed?: boolean;
          notify_daily_agenda?: boolean;
          notify_new_booking?: boolean;
          notify_product_news?: boolean;
          onboarding_completed_at?: string | null;
          timezone?: string;
          updated_at?: string;
          username?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<never, never>;
    Functions: {
      generate_username: { Args: { seed: string }; Returns: string };
      get_busy_intervals: {
        Args: { p_from: string; p_to: string; p_user_id: string };
        Returns: { ends_at: string; starts_at: string }[];
      };
      get_public_availability: {
        Args: { p_user_id: string };
        Returns: { end_minute: number; start_minute: number; weekday: number }[];
      };
      get_public_host: {
        Args: { p_username: string };
        Returns: {
          avatar_url: string;
          full_name: string;
          id: string;
          job_title: string;
          timezone: string;
          username: string;
        }[];
      };
      get_public_meeting_types: {
        Args: { p_username: string };
        Returns: {
          booking_window_days: number;
          buffer_minutes: number;
          description: string;
          duration_minutes: number;
          id: string;
          location: string;
          minimum_notice_minutes: number;
          name: string;
          slug: string;
        }[];
      };
      is_admin: { Args: never; Returns: boolean };
      seed_default_availability: { Args: { p_user_id: string }; Returns: undefined };
    };
    Enums: {
      booking_status: "confirmed" | "cancelled";
      cancelled_by: "host" | "guest";
    };
    CompositeTypes: Record<never, never>;
  };
};

type PublicSchema = Database["public"];

export type Tables<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T]["Row"];
export type TablesInsert<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T]["Insert"];
export type TablesUpdate<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T]["Update"];
export type Enums<T extends keyof PublicSchema["Enums"]> =
  PublicSchema["Enums"][T];
export type FunctionReturns<T extends keyof PublicSchema["Functions"]> =
  PublicSchema["Functions"][T]["Returns"];
