-- Law Digest — Milestone 5, migration 0008
--
-- Replaces the Cloudinary article-cover-image flow with Supabase Storage.
-- Public bucket so getPublicUrl() results work directly in <img src> with
-- no signed URLs. RLS on storage.objects follows the exact 0002/0003
-- pattern already used for every table in this schema: anon/authenticated
-- can read, only authenticated (== admin, per 0003's note) can write.

insert into storage.buckets (id, name, public)
values ('article-images', 'article-images', true)
on conflict (id) do nothing;

create policy "public_read_article_images"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'article-images');

create policy "authenticated_write_article_images"
  on storage.objects for all
  to authenticated
  using (bucket_id = 'article-images')
  with check (bucket_id = 'article-images');
