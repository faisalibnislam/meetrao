-- ─────────────────────────────────────────────────────────────────────────────
-- 0017 · The support address is hello@, not support@
--
-- `platform_settings.support_email` is where the contact form delivers, and it
-- is editable from the admin console — so the value that matters is the ROW,
-- not the column default. 0001 shipped both as support@meetrao.com, an address
-- that turns out never to have had a mailbox behind it: the contact form has
-- been delivering to somewhere nobody can read.
--
-- Both are corrected here. The update is guarded on the old value so an admin
-- who has already pointed this somewhere deliberate is not overwritten.
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.platform_settings
  alter column support_email set default 'hello@meetrao.com';

update public.platform_settings
set support_email = 'hello@meetrao.com'
where support_email = 'support@meetrao.com';
