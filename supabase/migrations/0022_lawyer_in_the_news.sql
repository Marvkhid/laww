-- ═══════════════════════════════════════════════════════════════════════════
-- 0022 — Lawyer in the News (Cover Story)
-- One featured interview with N Q&A pairs + 1 cover image + 4 inline images.
-- ═══════════════════════════════════════════════════════════════════════════

create table if not exists public.lawyer_in_the_news (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  lawyer_name text not null,
  lawyer_title text,
  intro text,
  cover_image_url text,
  cover_image_alt text,
  image_1_url text,
  image_1_alt text,
  image_1_position text,
  image_2_url text,
  image_2_alt text,
  image_2_position text,
  image_3_url text,
  image_3_alt text,
  image_3_position text,
  image_4_url text,
  image_4_alt text,
  image_4_position text,
  qa_pairs jsonb not null default '[]'::jsonb,
  status text not null default 'pending_review'
    check (status in ('pending_review', 'published', 'archived')),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_updated_at before update on public.lawyer_in_the_news
  for each row execute function set_updated_at();

create index if not exists idx_litn_status on public.lawyer_in_the_news(status);
create index if not exists idx_litn_published_at on public.lawyer_in_the_news(published_at desc);

alter table public.lawyer_in_the_news enable row level security;

create policy "public_read_lawyer_in_the_news"
  on public.lawyer_in_the_news for select
  using (status = 'published');

create policy "authenticated_write_lawyer_in_the_news"
  on public.lawyer_in_the_news for all
  to authenticated
  using (true)
  with check (true);
