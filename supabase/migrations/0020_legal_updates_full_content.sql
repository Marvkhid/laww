-- Law Digest — Migration 0020
-- Transforms legal_updates from external-link items to full on-site articles.
--   1. Adds `slug` (unique, not null) for public URLs.
--   2. Adds `body` (jsonb) for full article content (Tiptap JSON).
--   3. Drops the NOT NULL constraint on `source_url` — the field is kept for
--      backward compatibility but is no longer required.

-- Add slug column
ALTER TABLE public.legal_updates
  ADD COLUMN slug text;

-- Backfill existing rows with a slug derived from headline + id
UPDATE public.legal_updates
SET slug = lower(regexp_replace(headline, '[^a-zA-Z0-9]+', '-', 'g')) || '-' || left(id::text, 8)
WHERE slug IS NULL;

-- Now make slug NOT NULL and unique
ALTER TABLE public.legal_updates
  ALTER COLUMN slug SET NOT NULL;

ALTER TABLE public.legal_updates
  ADD CONSTRAINT legal_updates_slug_key UNIQUE (slug);

-- Add body column for full article content (Tiptap JSON)
ALTER TABLE public.legal_updates
  ADD COLUMN body jsonb;

-- Drop NOT NULL from source_url (keep column for backward compat)
ALTER TABLE public.legal_updates
  ALTER COLUMN source_url DROP NOT NULL;

-- Index for public slug lookups
CREATE INDEX IF NOT EXISTS legal_updates_slug_idx ON public.legal_updates (slug);
