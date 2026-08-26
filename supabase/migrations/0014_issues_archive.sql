-- Issues Archive
-- Past/previous issues that appear in the archive section.
-- Current issue remains in the `issues` table.

CREATE TABLE IF NOT EXISTS public.issues_archive (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug          text NOT NULL UNIQUE,
  title         text NOT NULL,          -- e.g. "Issue 38 — Spring 2026"
  description   text,                   -- short description
  cover_image_url text,
  issue_number  integer,                -- optional, for sorting
  season        text,                   -- optional, e.g. "Spring"
  year          integer,                -- optional
  pdf_url       text,                   -- optional downloadable PDF
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_issues_archive_slug ON public.issues_archive(slug);

-- RLS
ALTER TABLE public.issues_archive ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read issues_archive"
  ON public.issues_archive FOR SELECT
  USING (true);

CREATE POLICY "Admin manage issues_archive"
  ON public.issues_archive FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');
