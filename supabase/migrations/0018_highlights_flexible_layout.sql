-- Make title and content optional for homepage_highlights
-- (Image-only highlights should be valid)
-- Also add image_position for left/right layout control

ALTER TABLE public.homepage_highlights
  ALTER COLUMN title DROP NOT NULL,
  ALTER COLUMN content DROP NOT NULL,
  ALTER COLUMN title SET DEFAULT '',
  ALTER COLUMN content SET DEFAULT '';

-- Add image_position: 'left' or 'right' (default 'left')
ALTER TABLE public.homepage_highlights
  ADD COLUMN IF NOT EXISTS image_position text NOT NULL DEFAULT 'left';

-- Update existing rows to have empty string instead of null for title/content
UPDATE public.homepage_highlights SET title = '' WHERE title IS NULL;
UPDATE public.homepage_highlights SET content = '' WHERE content IS NULL;
