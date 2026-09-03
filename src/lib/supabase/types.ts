import type { JSONContent } from "@tiptap/core";

// Hand-written to match supabase/migrations/0001_init.sql exactly, and
// shaped to satisfy @supabase/postgrest-js's GenericTable/GenericSchema
// constraints (Row + Insert + Update + Relationships per table; Tables +
// Views + Functions per schema) — a Row-only Database type compiles but
// silently degrades every query builder result to `never`, which is why
// each table below carries all four fields even though M2 only performs
// reads. Once the project is live and linked, prefer regenerating this
// file with `supabase gen types typescript --linked` so it can never
// drift from the real schema — this file is the M2 stand-in until then.

export type ArticleStatus = "draft" | "published";
export type LegalUpdateOrigin = "auto_rss" | "manual";
export type LegalUpdateStatus = "pending_review" | "published" | "rejected";

export interface IssueRow {
  id: string;
  issue_number: number;
  season: string;
  year: number;
  edition: string;
  cover_image_url: string | null;
  pdf_url: string | null;
  price_ngn: string | null;
  price_uk: string | null;
  price_us: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}
type IssueInsert = Omit<IssueRow, "id" | "created_at" | "updated_at"> &
  Partial<Pick<IssueRow, "id" | "created_at" | "updated_at">>;
type IssueUpdate = Partial<IssueInsert>;

export interface PracticeAreaRow {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}
type PracticeAreaInsert = Omit<PracticeAreaRow, "id" | "created_at" | "updated_at"> &
  Partial<Pick<PracticeAreaRow, "id" | "created_at" | "updated_at">>;
type PracticeAreaUpdate = Partial<PracticeAreaInsert>;

export interface ContributorRow {
  id: string;
  slug: string;
  name: string;
  credentials: string | null;
  role: string;
  bio: string | null;
  photo_url: string | null;
  is_editorial_board: boolean;
  created_at: string;
  updated_at: string;
}
type ContributorInsert = Omit<ContributorRow, "id" | "created_at" | "updated_at" | "is_editorial_board"> &
  Partial<Pick<ContributorRow, "id" | "created_at" | "updated_at" | "is_editorial_board">>;
type ContributorUpdate = Partial<ContributorInsert>;

export interface ArticleRow {
  id: string;
  issue_id: string | null;
  practice_area_id: string | null;
  slug: string;
  title: string;
  dek: string | null;
  page_number: number | null;
  body: JSONContent | null;
  cover_image_url: string | null;
  image_1_url: string | null;
  image_1_alt: string | null;
  image_1_position: string | null;
  image_2_url: string | null;
  image_2_alt: string | null;
  image_2_position: string | null;
  image_3_url: string | null;
  image_3_alt: string | null;
  image_3_position: string | null;
  image_4_url: string | null;
  image_4_alt: string | null;
  image_4_position: string | null;
  status: ArticleStatus;
  featured: boolean;
  is_editorial_insight: boolean;
  on_cover: boolean;
  is_cover_story: boolean;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}
type ArticleOptionalKeys =
  | "id"
  | "issue_id"
  | "practice_area_id"
  | "dek"
  | "page_number"
  | "body"
  | "cover_image_url"
  | "image_1_url"
  | "image_1_alt"
  | "image_1_position"
  | "image_2_url"
  | "image_2_alt"
  | "image_2_position"
  | "image_3_url"
  | "image_3_alt"
  | "image_3_position"
  | "image_4_url"
  | "image_4_alt"
  | "image_4_position"
  | "status"
  | "featured"
  | "is_editorial_insight"
  | "on_cover"
  | "is_cover_story"
  | "published_at"
  | "created_at"
  | "updated_at";
type ArticleInsert = Omit<ArticleRow, ArticleOptionalKeys> & Partial<Pick<ArticleRow, ArticleOptionalKeys>>;
type ArticleUpdate = Partial<ArticleInsert>;

export interface ArticleContributorRow {
  article_id: string;
  contributor_id: string;
  author_order: number;
}
type ArticleContributorInsert = Omit<ArticleContributorRow, "author_order"> &
  Partial<Pick<ArticleContributorRow, "author_order">>;
type ArticleContributorUpdate = Partial<ArticleContributorInsert>;

export interface LegalUpdateRow {
  id: string;
  slug: string;
  headline: string;
  summary: string | null;
  source_name: string;
  source_url: string | null;
  body: JSONContent | null;
  cover_image_url: string | null;
  image_1_url: string | null;
  image_1_alt: string | null;
  image_1_position: string | null;
  image_2_url: string | null;
  image_2_alt: string | null;
  image_2_position: string | null;
  image_3_url: string | null;
  image_3_alt: string | null;
  image_3_position: string | null;
  image_4_url: string | null;
  image_4_alt: string | null;
  image_4_position: string | null;
  practice_area_id: string | null;
  origin: LegalUpdateOrigin;
  status: LegalUpdateStatus;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}
type LegalUpdateOptionalKeys =
  | "id"
  | "slug"
  | "summary"
  | "body"
  | "practice_area_id"
  | "origin"
  | "status"
  | "published_at"
  | "created_at"
  | "updated_at";
type LegalUpdateInsert = Omit<LegalUpdateRow, LegalUpdateOptionalKeys> &
  Partial<Pick<LegalUpdateRow, LegalUpdateOptionalKeys>>;
type LegalUpdateUpdate = Partial<LegalUpdateInsert>;

export interface NewsletterSubscriberRow {
  id: string;
  email: string;
  follow_up_sent: boolean;
  created_at: string;
}
type NewsletterSubscriberOptionalKeys = "id" | "created_at" | "follow_up_sent";
type NewsletterSubscriberInsert = Omit<NewsletterSubscriberRow, NewsletterSubscriberOptionalKeys> &
  Partial<Pick<NewsletterSubscriberRow, NewsletterSubscriberOptionalKeys>>;
type NewsletterSubscriberUpdate = Partial<NewsletterSubscriberInsert>;

export interface SponsorRow {
  id: string;
  name: string;
  logo_url: string | null;
  website_url: string | null;
  tier: string | null;
  placement: string;
  image_url: string | null;
  display_order: number;
  page_number: number | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}
type SponsorOptionalKeys =
  | "id"
  | "logo_url"
  | "website_url"
  | "tier"
  | "display_order"
  | "active"
  | "created_at"
  | "updated_at";
type SponsorInsert = Omit<SponsorRow, SponsorOptionalKeys> & Partial<Pick<SponsorRow, SponsorOptionalKeys>>;
type SponsorUpdate = Partial<SponsorInsert>;

export interface CallForPapersRow {
  id: string;
  issue_number: number;
  issue_month: string;
  deadline: string;
  word_limit: number;
  contact_email: string;
  created_at: string;
  updated_at: string;
}
type CallForPapersInsert = Omit<CallForPapersRow, "id" | "created_at" | "updated_at"> &
  Partial<Pick<CallForPapersRow, "id" | "created_at" | "updated_at">>;
type CallForPapersUpdate = Partial<CallForPapersInsert>;

export interface CallForPapersPracticeAreaRow {
  call_for_papers_id: string;
  practice_area_id: string;
}
type CallForPapersPracticeAreaInsert = CallForPapersPracticeAreaRow;
type CallForPapersPracticeAreaUpdate = Partial<CallForPapersPracticeAreaInsert>;

export interface EventRow {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  cover_image_url: string | null;
  published: boolean;
  event_date: string | null;
  page_number: number | null;
  created_at: string;
  updated_at: string;
}
type EventInsert = Omit<EventRow, "id" | "created_at" | "updated_at"> &
  Partial<Pick<EventRow, "id" | "created_at" | "updated_at">>;
type EventUpdate = Partial<EventInsert>;

export interface EventImageRow {
  id: string;
  event_id: string;
  image_url: string;
  caption: string | null;
  display_order: number;
  created_at: string;
}
type EventImageInsert = Omit<EventImageRow, "id" | "created_at"> &
  Partial<Pick<EventImageRow, "id" | "created_at">>;
type EventImageUpdate = Partial<EventImageInsert>;

export interface IssuesArchiveRow {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  cover_image_url: string | null;
  issue_number: number | null;
  season: string | null;
  year: number | null;
  pdf_url: string | null;
  created_at: string;
  updated_at: string;
}
type IssuesArchiveInsert = Omit<IssuesArchiveRow, "id" | "created_at" | "updated_at"> &
  Partial<Pick<IssuesArchiveRow, "id" | "created_at" | "updated_at">>;
type IssuesArchiveUpdate = Partial<IssuesArchiveInsert>;

export interface LegalInsightRow {
  id: string;
  title: string;
  content: string;
  description: string | null;
  category: string;
  image_url: string | null;
  published: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}
type LegalInsightInsert = Omit<LegalInsightRow, "id" | "created_at" | "updated_at"> &
  Partial<Pick<LegalInsightRow, "id" | "created_at" | "updated_at">>;
type LegalInsightUpdate = Partial<LegalInsightInsert>;

export interface HomepageHighlightRow {
  id: string;
  title: string;
  content: string;
  caption: string | null;
  category: string | null;
  image_url: string | null;
  image_position: string;
  published: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}
type HomepageHighlightInsert = Omit<HomepageHighlightRow, "id" | "created_at" | "updated_at"> &
  Partial<Pick<HomepageHighlightRow, "id" | "created_at" | "updated_at">>;
type HomepageHighlightUpdate = Partial<HomepageHighlightInsert>;

export interface Database {
  public: {
    Tables: {
      issues: { Row: IssueRow; Insert: IssueInsert; Update: IssueUpdate; Relationships: [] };
      practice_areas: {
        Row: PracticeAreaRow;
        Insert: PracticeAreaInsert;
        Update: PracticeAreaUpdate;
        Relationships: [];
      };
      contributors: {
        Row: ContributorRow;
        Insert: ContributorInsert;
        Update: ContributorUpdate;
        Relationships: [];
      };
      articles: {
        Row: ArticleRow;
        Insert: ArticleInsert;
        Update: ArticleUpdate;
        Relationships: [];
      };
      article_contributors: {
        Row: ArticleContributorRow;
        Insert: ArticleContributorInsert;
        Update: ArticleContributorUpdate;
        Relationships: [];
      };
      legal_updates: {
        Row: LegalUpdateRow;
        Insert: LegalUpdateInsert;
        Update: LegalUpdateUpdate;
        Relationships: [];
      };
      sponsors: {
        Row: SponsorRow;
        Insert: SponsorInsert;
        Update: SponsorUpdate;
        Relationships: [];
      };
      call_for_papers: {
        Row: CallForPapersRow;
        Insert: CallForPapersInsert;
        Update: CallForPapersUpdate;
        Relationships: [];
      };
      call_for_papers_practice_areas: {
        Row: CallForPapersPracticeAreaRow;
        Insert: CallForPapersPracticeAreaInsert;
        Update: CallForPapersPracticeAreaUpdate;
        Relationships: [];
      };
      newsletter_subscribers: {
        Row: NewsletterSubscriberRow;
        Insert: NewsletterSubscriberInsert;
        Update: NewsletterSubscriberUpdate;
        Relationships: [];
      };
      events: {
        Row: EventRow;
        Insert: EventInsert;
        Update: EventUpdate;
        Relationships: [];
      };
      event_images: {
        Row: EventImageRow;
        Insert: EventImageInsert;
        Update: EventImageUpdate;
        Relationships: [];
      };
      issues_archive: {
        Row: IssuesArchiveRow;
        Insert: IssuesArchiveInsert;
        Update: IssuesArchiveUpdate;
        Relationships: [];
      };
      legal_insights: {
        Row: LegalInsightRow;
        Insert: LegalInsightInsert;
        Update: LegalInsightUpdate;
        Relationships: [];
      };
      homepage_highlights: {
        Row: HomepageHighlightRow;
        Insert: HomepageHighlightInsert;
        Update: HomepageHighlightUpdate;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
}
