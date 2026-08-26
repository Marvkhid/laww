-- Article Inline Images
-- Up to 4 positioned images within an article's content.

ALTER TABLE public.articles
  ADD COLUMN IF NOT EXISTS image_1_url text,
  ADD COLUMN IF NOT EXISTS image_1_alt text,
  ADD COLUMN IF NOT EXISTS image_1_position text DEFAULT 'top-right',
  ADD COLUMN IF NOT EXISTS image_2_url text,
  ADD COLUMN IF NOT EXISTS image_2_alt text,
  ADD COLUMN IF NOT EXISTS image_2_position text DEFAULT 'bottom-left',
  ADD COLUMN IF NOT EXISTS image_3_url text,
  ADD COLUMN IF NOT EXISTS image_3_alt text,
  ADD COLUMN IF NOT EXISTS image_3_position text DEFAULT 'center-right',
  ADD COLUMN IF NOT EXISTS image_4_url text,
  ADD COLUMN IF NOT EXISTS image_4_alt text,
  ADD COLUMN IF NOT EXISTS image_4_position text DEFAULT 'center-left';
