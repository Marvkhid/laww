-- Add page_number to events and sponsors
-- Articles already have page_number; this extends the same pattern.

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS page_number integer;

ALTER TABLE public.sponsors
  ADD COLUMN IF NOT EXISTS page_number integer;
