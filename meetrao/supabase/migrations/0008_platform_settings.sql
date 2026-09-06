-- Meetrao — platform settings
--
-- A single row, edited on Admin › Settings. Readable by any signed-in user so
-- the app name and support address can be shown in-product; writable only by
-- admins.

create table public.platform_settings (
  id            boolean primary key default true,
  app_name      text not null default 'Meetrao',
  support_email text not null default 'support@meetrao.com',
  updated_at    timestamptz not null default now(),
  -- Forces exactly one row: the primary key can only ever hold `true`.
  constraint platform_settings_singleton check (id)
);

insert into public.platform_settings (id) values (true) on conflict do nothing;

create trigger platform_settings_touch_updated_at
  before update on public.platform_settings
  for each row execute function public.touch_updated_at();

alter table public.platform_settings enable row level security;
revoke all on public.platform_settings from anon, authenticated;

grant select on public.platform_settings to authenticated;
grant update (app_name, support_email) on public.platform_settings to authenticated;

create policy platform_settings_select on public.platform_settings
  for select to authenticated
  using (true);

create policy platform_settings_update_admin on public.platform_settings
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());
