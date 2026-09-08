-- Guest cancellation raised 42702 on every call.
--
-- cancel_booking_by_reference is declared RETURNS TABLE(id uuid, host_id uuid,
-- ...), which puts `id` in scope as an OUT variable for the whole body. Its
-- UPDATE then said `where id = v.id`, and Postgres cannot tell whether that
-- first `id` means the OUT variable or bookings.id:
--
--   ERROR: 42702: column reference "id" is ambiguous
--   DETAIL: It could refer to either a PL/pgSQL variable or a table column.
--
-- plpgsql.variable_conflict defaults to `error`, so this was not conditional on
-- the data — every cancellation failed, and only the confirmed→cancelled branch
-- reaches the statement, so a lookup of an already-cancelled booking still
-- worked and hid it.
--
-- The fix is to alias the update target and qualify both sides. Nothing else
-- about the function changes.
create or replace function public.cancel_booking_by_reference(p_reference text)
returns table (
  id            uuid,
  host_id       uuid,
  meeting_name  text,
  starts_at     timestamptz,
  guest_name    text,
  guest_email   text,
  was_open      boolean
)
language plpgsql security definer set search_path to 'public', 'pg_temp' as $$
declare v public.bookings%rowtype; v_open boolean;
begin
  select * into v from public.bookings b where b.reference = p_reference for update;
  if v.id is null then
    raise exception 'unknown booking' using errcode = 'MR404';
  end if;

  v_open := v.status = 'confirmed';

  if v_open then
    update public.bookings b
      set status = 'cancelled', cancelled_at = now(), cancelled_by = 'guest'
      where b.id = v.id
      returning b.* into v;
  end if;

  id := v.id;
  host_id := v.host_id;
  meeting_name := v.meeting_name;
  starts_at := v.starts_at;
  guest_name := v.guest_name;
  guest_email := v.guest_email;
  was_open := v_open;
  return next;
end;
$$;

-- create or replace resets grants to the defaults, so re-apply 0002's intent.
revoke all on function public.cancel_booking_by_reference(text) from public;
grant execute on function public.cancel_booking_by_reference(text) to anon, authenticated, service_role;
