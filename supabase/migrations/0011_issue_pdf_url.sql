-- Law Digest — Add pdf_url column to issues table
-- Stores the Supabase Storage URL for the digital edition PDF.

alter table public.issues
  add column pdf_url text null;

comment on column public.issues.pdf_url is 'Supabase Storage URL for the digital edition PDF';
