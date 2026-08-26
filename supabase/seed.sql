-- Law Digest — Milestone 2 seed data
-- Every value here is taken directly from src/lib/content/issue-39.ts.
-- Nothing invented. Run once, after 0001_init.sql and 0002_rls_policies.sql,
-- against a schema with no existing rows in these tables.

-- ─────────────────────────────────────────────────────────────────────────
-- Issue 39
-- ─────────────────────────────────────────────────────────────────────────
insert into public.issues
  (issue_number, season, year, edition, cover_image_url, price_ngn, price_uk, price_us, published_at)
values
  (39, 'Summer', 2026, 'Nigeria Issue', '/images/issue-39/kash-balogun.jpg',
   '₦2,500', '£3.50', '$5.50', now());

-- ─────────────────────────────────────────────────────────────────────────
-- Practice areas (real Issue 40 call-for-papers taxonomy)
-- ─────────────────────────────────────────────────────────────────────────
insert into public.practice_areas (slug, name) values
  ('corporate-governance', 'Corporate Governance'),
  ('arbitration', 'Arbitration'),
  ('cross-jurisdictional-litigation', 'Cross-Jurisdictional Litigation & Enforcement'),
  ('consumer-protection', 'Consumer Protection'),
  ('capital-markets', 'Capital Markets'),
  ('banking-islamic-finance', 'Banking & Islamic Finance'),
  ('commercial-corporate-law', 'Commercial & Corporate Law'),
  ('criminal-law', 'Criminal Law'),
  ('tax', 'Tax'),
  ('energy-power-law', 'Energy & Power Law');

-- ─────────────────────────────────────────────────────────────────────────
-- Contributors — editor-in-chief, Nigeria editor, and this issue's authors
-- ─────────────────────────────────────────────────────────────────────────
insert into public.contributors (slug, name, credentials, role, is_editorial_board) values
  ('seyi-clement', 'Seyi Clement', null, 'Editor-in-Chief', false),
  ('yemi-oke', 'Prof. Yemi Oke', 'SAN', 'Editor, Nigeria Issue', false),
  ('modupe-olusoga', 'Modupe Olusoga', null, 'Contributor', false),
  ('agatha-mcmuda', 'Agatha McMuda', null, 'Contributor', false),
  ('genevieve-nwodo-wakeley-jones', 'Genevieve Nwodo Wakeley-Jones', null, 'Contributor', false),
  ('aduke-onafowokan', 'Aduke Onafowokan', null, 'Contributor', false),
  ('oluwatoyin-modupe-asada', 'Oluwatoyin Modupe Asada', null, 'Contributor', false),
  ('adedunmade-onibokun', 'Adedunmade Onibokun', null, 'Contributor', false),
  ('kemi-afesojaye', 'Kemi Afesojaye', null, 'Contributor', false),
  ('alfred-m-tijah', 'Alfred M. Tijah', 'LL.M', 'Contributor', false);

-- ─────────────────────────────────────────────────────────────────────────
-- Editorial board (same contributors table, is_editorial_board = true)
-- ─────────────────────────────────────────────────────────────────────────
insert into public.contributors (slug, name, credentials, role, is_editorial_board) values
  ('hon-justice-s-m-a-belgore', 'Hon Justice S.M.A Belgore', 'CON, GCON, FNIALS, LLD (Hon)', 'Former Chief Justice of Nigeria', true),
  ('hon-justice-george-oguntade', 'Hon Justice George Oguntade', 'CFR, JSC (Rtd)', 'Editorial Board', true),
  ('anthony-c-k-kakoza', 'Dr. Anthony C.K Kakoza', 'Ph.D', 'Dean, Faculty of Law, Uganda Christian University', true),
  ('kemi-pinheiro', 'Kemi Pinheiro', 'SAN', 'Founding Partner, Pinheiro LP', true),
  ('dakas-cj-dakas', 'Professor Dakas CJ Dakas', 'Ph.D, SAN', 'Distinguished Professor of Law, Director of Research, NIALS', true),
  ('uche-ewelukwa-ofodile', 'Dr. Uche Ewelukwa Ofodile', 'LLM (London, Harvard), SJD (Harvard)', 'Professor of Law, University of Arkansas School of Law', true),
  ('adetokunbo-derek-obadina', 'Dr. Adetokunbo Derek Obadina', 'B.A (Hons) (Sussex), LLM (London), Ph.D (Wales)', 'Dean, Faculty of Law, Lagos State University', true),
  ('edwin-egede', 'Prof. Edwin Egede', 'LLB (Hons), BL, LLM, Ph.D', 'Senior Lecturer, Cardiff University', true),
  ('njaramba-gichuki', 'Njaramba Gichuki', null, 'Senior Lecturer, University of Nairobi; Member, Editorial Board, East Africa Law Journal', true);

-- ─────────────────────────────────────────────────────────────────────────
-- Articles — all 7 real Issue 39 pieces
-- on_cover matches the real page-numbered teaser strip (6, 14, 30, 32, 39)
-- featured / is_editorial_insight match the current homepage curation
-- ─────────────────────────────────────────────────────────────────────────
insert into public.articles
  (issue_id, practice_area_id, slug, title, page_number, status, featured, is_editorial_insight, on_cover, published_at) values
  ((select id from public.issues where issue_number = 39),
   (select id from public.practice_areas where slug = 'commercial-corporate-law'),
   'transgenerational-law-firm-practice', 'Transgenerational Law Firm Practice In Nigeria',
   6, 'published', true, false, true, now()),

  ((select id from public.issues where issue_number = 39),
   (select id from public.practice_areas where slug = 'commercial-corporate-law'),
   'understanding-the-business-of-law',
   'Understanding The Business of Law: Why Legal Excellence Alone is No Longer Enough',
   14, 'published', true, false, true, now()),

  ((select id from public.issues where issue_number = 39),
   (select id from public.practice_areas where slug = 'cross-jurisdictional-litigation'),
   'high-stakes-witness-preparation',
   'Why High-Stakes Witness Preparation May Be the Missing Piece in Nigeria''s Governance, Regulatory and Commercial Landscape',
   30, 'published', true, false, true, now()),

  ((select id from public.issues where issue_number = 39),
   (select id from public.practice_areas where slug = 'corporate-governance'),
   'can-nigeria-rebuild-its-manufacturing-sector',
   'Can Nigeria Rebuild Its Manufacturing Sector? What the Dangote-Peugeot Revival Says About Investor Confidence and Industrial Growth',
   32, 'published', true, false, true, now()),

  ((select id from public.issues where issue_number = 39),
   null,
   'beyond-restitution-benin-bronzes', 'Beyond Restitution: Building Bridges with the Benin Bronzes',
   35, 'published', false, true, false, now()),

  ((select id from public.issues where issue_number = 39),
   null,
   'tourism-development-in-nigeria',
   'Tourism Development In Nigeria Beyond Showcasing Attractions: Building Structures, Governance Systems, And A Sustainable Economic Framework',
   39, 'published', false, true, true, now()),

  ((select id from public.issues where issue_number = 39),
   (select id from public.practice_areas where slug = 'energy-power-law'),
   'minister-of-power-electric-sector-reform',
   'The Role of the Minister of Power in Nigerian Electric Power Sector Reform: A Legal Perspective',
   46, 'published', false, true, false, now());

-- ─────────────────────────────────────────────────────────────────────────
-- Article <-> contributor links (byline authorship, including the one
-- genuinely co-authored piece)
-- ─────────────────────────────────────────────────────────────────────────
insert into public.article_contributors (article_id, contributor_id, author_order) values
  ((select id from public.articles where slug = 'transgenerational-law-firm-practice'),
   (select id from public.contributors where slug = 'modupe-olusoga'), 1),

  ((select id from public.articles where slug = 'understanding-the-business-of-law'),
   (select id from public.contributors where slug = 'agatha-mcmuda'), 1),

  ((select id from public.articles where slug = 'high-stakes-witness-preparation'),
   (select id from public.contributors where slug = 'genevieve-nwodo-wakeley-jones'), 1),
  ((select id from public.articles where slug = 'high-stakes-witness-preparation'),
   (select id from public.contributors where slug = 'aduke-onafowokan'), 2),

  ((select id from public.articles where slug = 'can-nigeria-rebuild-its-manufacturing-sector'),
   (select id from public.contributors where slug = 'oluwatoyin-modupe-asada'), 1),

  ((select id from public.articles where slug = 'beyond-restitution-benin-bronzes'),
   (select id from public.contributors where slug = 'adedunmade-onibokun'), 1),

  ((select id from public.articles where slug = 'tourism-development-in-nigeria'),
   (select id from public.contributors where slug = 'kemi-afesojaye'), 1),

  ((select id from public.articles where slug = 'minister-of-power-electric-sector-reform'),
   (select id from public.contributors where slug = 'alfred-m-tijah'), 1);

-- ─────────────────────────────────────────────────────────────────────────
-- Call for Papers — real Issue 40 CFP
-- ─────────────────────────────────────────────────────────────────────────
insert into public.call_for_papers (issue_number, issue_month, deadline, word_limit, contact_email) values
  (40, 'October 2026', '2026-09-26', 3000, 'tayoadeyemi247@gmail.com');

insert into public.call_for_papers_practice_areas (call_for_papers_id, practice_area_id)
select
  (select id from public.call_for_papers where issue_number = 40),
  practice_areas.id
from public.practice_areas;

-- No rows inserted for sponsors or legal_updates — no real sponsors exist
-- yet, and legal_updates is populated at runtime (RSS ingestion / editorial
-- entries), not seeded.
