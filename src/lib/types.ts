import type { JSONContent } from "@tiptap/core";

export interface Author {
  name: string;
  credentials?: string;
  photoUrl?: string | null;
}

export interface ArticleImage {
  url: string | null;
  alt: string | null;
  position: string | null;
}

export interface Article {
  id?: string;
  slug: string;
  title: string;
  author: Author;
  page: number;
  practiceArea?: string;
  practiceAreaId?: string | null;
  dek?: string;
  imageAlt: string;
  body?: JSONContent | null;
  coverImageUrl?: string | null;
  images?: ArticleImage[];
}

export interface CoverStory {
  subjectName: string;
  subjectRole: string;
  dek: string;
  imageSrc: string;
  imageAlt: string;
}

export interface Contributor {
  slug: string;
  name: string;
  role: string;
  bio?: string | null;
  photoUrl?: string | null;
}

export interface PracticeArea {
  slug: string;
  name: string;
  description?: string | null;
}

export interface IssueMeta {
  issueNumber: number;
  season: string;
  year: number;
  edition: string;
  coverImageSrc: string | null;
  coverImageAlt: string;
  pdfUrl: string | null;
  priceNigeria: string;
  priceUK: string;
  priceUS: string;
}

export interface CallForPapers {
  nextIssueNumber: number;
  nextIssueMonth: string;
  deadline: string;
  wordLimit: number;
  contactEmail: string;
  topics: string[];
}

export interface EditorialBoardMember {
  name: string;
  credentials?: string;
  role: string;
}

export interface Masthead {
  editorInChief: { name: string; email?: string };
  editorNigeria: { name: string };
  businessDevelopment: { name: string; email: string };
  subscriptionsContact: { name: string; phone: string; email: string };
}

export interface LegalUpdate {
  id: string;
  slug: string;
  headline: string;
  summary: string | null;
  sourceName: string;
  publishedAt: string;
  practiceArea?: string;
  body?: JSONContent | null;
}

export interface Event {
  slug: string;
  title: string;
  description?: string | null;
  coverImageUrl?: string | null;
  eventDate?: string | null;
  pageNumber?: number | null;
  galleryImages?: EventGalleryImage[];
}

export interface EventGalleryImage {
  id: string;
  imageUrl: string;
  caption?: string | null;
  displayOrder: number;
}

export interface IssueArchive {
  slug: string;
  title: string;
  description?: string | null;
  coverImageUrl?: string | null;
  issueNumber?: number | null;
  season?: string | null;
  year?: number | null;
  pdfUrl?: string | null;
}

export interface Sponsor {
  name: string;
  logoUrl?: string;
  websiteUrl?: string;
  tier?: string;
  placement?: string;
  imageUrl?: string;
  pageNumber?: number | null;
}

export interface LegalInsight {
  id: string;
  title: string;
  content: string;
  description?: string | null;
  category: string;
  imageUrl?: string | null;
  answerOptions: string[];
  correctOption: number | null;
  published: boolean;
  displayOrder: number;
}

export interface LawyerQAPairView {
  question: string;
  answer: string;
}

export interface LawyerInTheNews {
  id: string;
  slug: string;
  lawyerName: string;
  lawyerTitle?: string | null;
  intro?: string | null;
  coverImageUrl?: string | null;
  coverImageAlt?: string | null;
  qaPairs: LawyerQAPairView[];
}

export interface HomepageHighlight {
  id: string;
  title: string;
  content: string;
  caption?: string | null;
  category?: string | null;
  imageUrl?: string | null;
  imagePosition?: string | null;
  published: boolean;
  displayOrder: number;
}
