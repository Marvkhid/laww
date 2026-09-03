-- Law Digest — Migration 0021
-- Adds image support to legal_updates, mirroring the articles table pattern:
--   1 cover image + 4 inline images with alt text and position metadata.

ALTER TABLE public.legal_updates
  ADD COLUMN cover_image_url text,
  ADD COLUMN image_1_url text,
  ADD COLUMN image_1_alt text,
  ADD COLUMN image_1_position text,
  ADD COLUMN image_2_url text,
  ADD COLUMN image_2_alt text,
  ADD COLUMN image_2_position text,
  ADD COLUMN image_3_url text,
  ADD COLUMN image_3_alt text,
  ADD COLUMN image_3_position text,
  ADD COLUMN image_4_url text,
  ADD COLUMN image_4_alt text,
  ADD COLUMN image_4_position text;
