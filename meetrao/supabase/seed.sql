-- Meetrao — demo data
--
-- Optional. Creates one host you can sign in as immediately, so every screen
-- has something in it before any real signup. Safe to run more than once.
--
--   email:    demo@meetrao.app
--   password: meetrao-demo-2026
--
-- The account is flagged is_admin so /admin is reachable too. DELETE IT before
-- this project carries anything real:
--
--   delete from auth.users where email = 'demo@meetrao.app';
--
-- Everything else cascades from that one row.

do $$
declare
  uid          uuid := '11111111-2222-4333-8444-555555555555';
  consult_id   uuid;
  deepdive_id  uuid;
  today        date := (now() at time zone 'Asia/Dhaka')::date;
begin
  -- ── auth user ───────────────────────────────────────────────────────────
  -- Written directly rather than through the admin API so the seed is just
  -- SQL. GoTrue reads `encrypted_password` as bcrypt, which pgcrypto provides.
  insert into auth.users (
    id, instance_id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at
  )
  values (
    uid,
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'demo@meetrao.app',
    extensions.crypt('meetrao-demo-2026', extensions.gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Faisal Rahman"}'::jsonb,
    now(), now()
  )
  on conflict (id) do nothing;

  -- Newer GoTrue requires a matching identity row for password sign-in.
  -- `email` is a generated column here (derived from identity_data), so it is
  -- deliberately not in the column list.
  insert into auth.identities (
    id, user_id, provider, provider_id, identity_data,
    last_sign_in_at, created_at, updated_at
  )
  values (
    gen_random_uuid(), uid, 'email', uid::text,
    jsonb_build_object('sub', uid::text, 'email', 'demo@meetrao.app',
                       'email_verified', true),
    now(), now(), now()
  )
  on conflict (provider, provider_id) do nothing;

  -- ── profile ─────────────────────────────────────────────────────────────
  -- The handle_new_user trigger already created a row; fill in the rest.
  update public.profiles
     set username                = 'faisal',
         full_name               = 'Faisal Rahman',
         job_title               = 'Product consultant',
         email                   = 'demo@meetrao.app',
         timezone                = 'Asia/Dhaka',
         is_admin                = true,
         onboarding_completed_at = now()
   where id = uid;

  -- ── meeting types ───────────────────────────────────────────────────────
  insert into public.meeting_types
    (user_id, name, description, slug, duration_minutes, buffer_minutes,
     minimum_notice_minutes, booking_window_days, is_active)
  values
    (uid, '30 Minute Consultation', 'A quick conversation to discuss your project.',
     '30-minute-consultation', 30, 0, 60, 30, true),
    (uid, 'Project Deep Dive', 'Review scope, timeline and budget in detail.',
     'project-deep-dive', 60, 10, 240, 30, true),
    (uid, 'Intro Call', 'Fifteen minutes to see if we are a fit.',
     'intro-call', 15, 0, 60, 30, false)
  on conflict (user_id, slug) do nothing;

  select id into consult_id  from public.meeting_types
    where user_id = uid and slug = '30-minute-consultation';
  select id into deepdive_id from public.meeting_types
    where user_id = uid and slug = 'project-deep-dive';

  -- ── availability ────────────────────────────────────────────────────────
  -- Mon 09:00–12:00 + 14:00–17:00, Tue–Thu 09:00–17:00, Fri 09:00–15:00.
  perform public.seed_default_availability(uid);

  -- ── bookings ────────────────────────────────────────────────────────────
  -- Anchored to "today" in the host's zone so the dashboard always has a
  -- Today row and a Later this week row, whenever the seed is run.
  if not exists (select 1 from public.bookings where host_id = uid) then
    insert into public.bookings
      (host_id, meeting_type_id, meeting_name, duration_minutes,
       guest_name, guest_email, guest_note, guest_timezone,
       starts_at, ends_at, status, meet_url)
    values
      (uid, consult_id, '30 Minute Consultation', 30,
       'John Smith', 'john@example.com',
       'Happy to share the current wireframes beforehand if useful.',
       'America/New_York',
       ((today + 1) + time '15:00') at time zone 'Asia/Dhaka',
       ((today + 1) + time '15:30') at time zone 'Asia/Dhaka',
       'confirmed', 'https://meet.google.com/qvd-mspt-jrb'),

      (uid, deepdive_id, 'Project Deep Dive', 60,
       'Amina Chowdhury', 'amina@northbridge.io', '', 'Asia/Dhaka',
       ((today + 2) + time '11:00') at time zone 'Asia/Dhaka',
       ((today + 2) + time '12:00') at time zone 'Asia/Dhaka',
       'confirmed', 'https://meet.google.com/bqt-mkfd-oyu'),

      (uid, consult_id, '30 Minute Consultation', 30,
       'Priya Nair', 'priya@nairstudio.com', '', 'Asia/Kolkata',
       ((today - 3) + time '16:00') at time zone 'Asia/Dhaka',
       ((today - 3) + time '16:30') at time zone 'Asia/Dhaka',
       'confirmed', 'https://meet.google.com/kdo-wsnp-tra');
  end if;
end $$;

select p.username,
       p.is_admin,
       (select count(*) from public.meeting_types      m where m.user_id = p.id) as meetings,
       (select count(*) from public.availability_rules a where a.user_id = p.id) as availability,
       (select count(*) from public.bookings           b where b.host_id = p.id) as bookings
from public.profiles p
where p.email = 'demo@meetrao.app';
