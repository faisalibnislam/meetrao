-- Meetrao — avatar storage
--
-- Profile photos are shown on the public booking page, so the bucket is
-- public-read. Writes are scoped to a folder named after the owner's user id,
-- which is what stops one host replacing another's photo.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,
  2 * 1024 * 1024, -- 2 MB
  array['image/png', 'image/jpeg', 'image/webp', 'image/gif']
)
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists avatars_public_read   on storage.objects;
drop policy if exists avatars_insert_own    on storage.objects;
drop policy if exists avatars_update_own    on storage.objects;
drop policy if exists avatars_delete_own    on storage.objects;

create policy avatars_public_read on storage.objects
  for select
  using (bucket_id = 'avatars');

-- storage.foldername(name)[1] is the first path segment: the owner's user id.
create policy avatars_insert_own on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy avatars_update_own on storage.objects
  for update to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy avatars_delete_own on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
