-- Legal Insights: admin-managed educational/informational content
-- displayed on the homepage as "Did You Know?" / "Know the Law" etc.

CREATE TABLE IF NOT EXISTS public.legal_insights (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title         text NOT NULL,
  content       text NOT NULL,
  description   text,
  category      text NOT NULL DEFAULT 'general',
  image_url     text,
  published     boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- Homepage Highlights: admin-managed editorial content cards
-- for random facts, quotes, images, spotlights, etc.

CREATE TABLE IF NOT EXISTS public.homepage_highlights (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title         text NOT NULL,
  content       text NOT NULL,
  caption       text,
  category      text,
  image_url     text,
  published     boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_legal_insights_published ON public.legal_insights(published);
CREATE INDEX IF NOT EXISTS idx_legal_insights_display_order ON public.legal_insights(display_order);
CREATE INDEX IF NOT EXISTS idx_homepage_highlights_published ON public.homepage_highlights(published);
CREATE INDEX IF NOT EXISTS idx_homepage_highlights_display_order ON public.homepage_highlights(display_order);

-- RLS
ALTER TABLE public.legal_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.homepage_highlights ENABLE ROW LEVEL SECURITY;

-- Public read for published content
CREATE POLICY "Public read legal_insights"
  ON public.legal_insights FOR SELECT
  USING (published = true);

CREATE POLICY "Public read homepage_highlights"
  ON public.homepage_highlights FOR SELECT
  USING (published = true);

-- Authenticated (admin) full access
CREATE POLICY "Admin manage legal_insights"
  ON public.legal_insights FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Admin manage homepage_highlights"
  ON public.homepage_highlights FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');
