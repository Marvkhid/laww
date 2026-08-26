import type {
  Article,
  CallForPapers,
  Contributor,
  CoverStory,
  EditorialBoardMember,
  IssueMeta,
  Masthead,
  PracticeArea,
} from "@/lib/types";

// Real content extracted from the Law Digest Issue 39 PDF (cover, masthead,
// editorial letter, contents page). Nothing here is invented — where the PDF
// didn't supply a detail (e.g. article deks), it's left out rather than guessed.

export const issueMeta: IssueMeta = {
  issueNumber: 39,
  season: "Summer",
  year: 2026,
  edition: "Nigeria Issue",
  coverImageSrc: "/images/issue-39/kash-balogun.jpg",
  coverImageAlt: "Law Digest Issue 39 cover, Summer 2026, Nigeria Issue",
  pdfUrl: null,
  priceNigeria: "₦2,500",
  priceUK: "£3.50",
  priceUS: "$5.50",
};

export const coverStory: CoverStory = {
  subjectName: "Kash Balogun",
  subjectRole: "Chair, British Nigeria Law Forum | Partner, Keystone Law",
  dek: "BNLF: Celebrating 25 Years of Building Cross-Boarder Collaboration Between the UK and Nigeria.",
  imageSrc: "/images/issue-39/kash-balogun.jpg",
  imageAlt: "Kash Balogun, Chair of the British Nigeria Law Forum",
};

// The real page-numbered teaser set from the physical cover.
export const inThisIssue: Article[] = [
  {
    slug: "transgenerational-law-firm-practice",
    title: "Transgenerational Law Firm Practice In Nigeria",
    author: { name: "Modupe Olusoga" },
    page: 6,
    imageAlt: "Transgenerational Law Firm Practice In Nigeria",
  },
  {
    slug: "understanding-the-business-of-law",
    title:
      "Understanding The Business of Law: Why Legal Excellence Alone is No Longer Enough",
    author: { name: "Agatha McMuda" },
    page: 14,
    imageAlt: "Understanding The Business of Law",
  },
  {
    slug: "high-stakes-witness-preparation",
    title:
      "Why High-Stakes Witness Preparation May Be the Missing Piece in Nigeria's Governance, Regulatory and Commercial Landscape",
    author: { name: "Genevieve Nwodo Wakeley-Jones" },
    page: 30,
    imageAlt: "High-Stakes Witness Preparation",
  },
  {
    slug: "can-nigeria-rebuild-its-manufacturing-sector",
    title:
      "Can Nigeria Rebuild Its Manufacturing Sector? What the Dangote-Peugeot Revival Says About Investor Confidence and Industrial Growth",
    author: { name: "Oluwatoyin Modupe Asada" },
    page: 32,
    imageAlt: "Can Nigeria Rebuild Its Manufacturing Sector?",
  },
  {
    slug: "tourism-development-in-nigeria",
    title:
      "Tourism Development In Nigeria Beyond Showcasing Attractions: Building Structures, Governance Systems, And A Sustainable Economic Framework",
    author: { name: "Kemi Afesojaye" },
    page: 39,
    imageAlt: "Tourism Development In Nigeria",
  },
];

// Flagship pieces for Featured Stories (subset of the full article set).
export const featuredStories: Article[] = [
  {
    slug: "transgenerational-law-firm-practice",
    title: "Transgenerational Law Firm Practice In Nigeria",
    author: { name: "Modupe Olusoga" },
    page: 6,
    practiceArea: "Commercial & Corporate Law",
    imageAlt: "Transgenerational Law Firm Practice In Nigeria",
  },
  {
    slug: "understanding-the-business-of-law",
    title:
      "Understanding The Business of Law: Why Legal Excellence Alone is No Longer Enough",
    author: { name: "Agatha McMuda" },
    page: 14,
    practiceArea: "Commercial & Corporate Law",
    imageAlt: "Understanding The Business of Law",
  },
  {
    slug: "high-stakes-witness-preparation",
    title:
      "Why High-Stakes Witness Preparation May Be the Missing Piece in Nigeria's Governance, Regulatory and Commercial Landscape",
    author: { name: "Genevieve Nwodo Wakeley-Jones" },
    page: 30,
    practiceArea: "Cross-Jurisdictional Litigation",
    imageAlt: "High-Stakes Witness Preparation",
  },
  {
    slug: "can-nigeria-rebuild-its-manufacturing-sector",
    title:
      "Can Nigeria Rebuild Its Manufacturing Sector? What the Dangote-Peugeot Revival Says About Investor Confidence and Industrial Growth",
    author: { name: "Oluwatoyin Modupe Asada" },
    page: 32,
    practiceArea: "Corporate Governance",
    imageAlt: "Can Nigeria Rebuild Its Manufacturing Sector?",
  },
];

// Analysis/opinion-angle pieces for Editorial Insights.
export const editorialInsights: Article[] = [
  {
    slug: "beyond-restitution-benin-bronzes",
    title: "Beyond Restitution: Building Bridges with the Benin Bronzes",
    author: { name: "Adedunmade Onibokun" },
    page: 35,
    imageAlt: "Beyond Restitution: Building Bridges with the Benin Bronzes",
  },
  {
    slug: "tourism-development-in-nigeria",
    title:
      "Tourism Development In Nigeria Beyond Showcasing Attractions: Building Structures, Governance Systems, And A Sustainable Economic Framework",
    author: { name: "Kemi Afesojaye" },
    page: 39,
    imageAlt: "Tourism Development In Nigeria",
  },
  {
    slug: "minister-of-power-electric-sector-reform",
    title:
      "The Role of the Minister of Power in Nigerian Electric Power Sector Reform: A Legal Perspective",
    author: { name: "Alfred M. Tijah", credentials: "LL.M" },
    page: 46,
    practiceArea: "Energy & Power Law",
    imageAlt: "The Role of the Minister of Power in Nigerian Electric Power Sector Reform",
  },
];

// Real CFP topics (Issue 40) reused as the Practice Areas taxonomy.
export const practiceAreas: PracticeArea[] = [
  { slug: "corporate-governance", name: "Corporate Governance" },
  { slug: "arbitration", name: "Arbitration" },
  { slug: "cross-jurisdictional-litigation", name: "Cross-Jurisdictional Litigation & Enforcement" },
  { slug: "consumer-protection", name: "Consumer Protection" },
  { slug: "capital-markets", name: "Capital Markets" },
  { slug: "banking-islamic-finance", name: "Banking & Islamic Finance" },
  { slug: "commercial-corporate-law", name: "Commercial & Corporate Law" },
  { slug: "criminal-law", name: "Criminal Law" },
  { slug: "tax", name: "Tax" },
  { slug: "energy-power-law", name: "Energy & Power Law" },
];

// Editor-in-Chief, Nigeria Issue editor, and this issue's contributing authors.
export const contributors: Contributor[] = [
  { slug: "seyi-clement", name: "Seyi Clement", role: "Editor-in-Chief" },
  { slug: "yemi-oke", name: "Prof. Yemi Oke", role: "Editor, Nigeria Issue (SAN)" },
  { slug: "modupe-olusoga", name: "Modupe Olusoga", role: "Contributor" },
  { slug: "agatha-mcmuda", name: "Agatha McMuda", role: "Contributor" },
  { slug: "genevieve-nwodo-wakeley-jones", name: "Genevieve Nwodo Wakeley-Jones", role: "Contributor" },
  { slug: "aduke-onafowokan", name: "Aduke Onafowokan", role: "Contributor" },
  { slug: "oluwatoyin-modupe-asada", name: "Oluwatoyin Modupe Asada", role: "Contributor" },
  { slug: "adedunmade-onibokun", name: "Adedunmade Onibokun", role: "Contributor" },
  { slug: "kemi-afesojaye", name: "Kemi Afesojaye", role: "Contributor" },
  { slug: "alfred-m-tijah", name: "Alfred M. Tijah", role: "Contributor (LL.M)" },
];

export const callForPapers: CallForPapers = {
  nextIssueNumber: 40,
  nextIssueMonth: "October 2026",
  deadline: "26 September 2026",
  wordLimit: 3000,
  contactEmail: "webmaster@nglawdigestblog.com",
  topics: practiceAreas.map((area) => area.name),
};

// Real masthead block (editor-in-chief, Nigeria editor, business/subscriptions contacts).
// editorInChief.email intentionally omitted: the previously listed
// editor@nglawdigest.com was an unconfirmed assumption, not a verified
// address, and has been removed rather than replaced with an unrelated
// contact — the confirmed tayoadeyemi247@gmail.com is specifically the
// Call for Papers contact above, not Seyi Clement's personal email.
export const masthead: Masthead = {
  editorInChief: { name: "Seyi Clement" },
  editorNigeria: { name: "Prof. Yemi Oke, SAN" },
  businessDevelopment: { name: "Bebe Clement", email: "bebe@bebeclement.com" },
  subscriptionsContact: {
    name: "Ayomide Adediran",
    phone: "+44 203 223 0805",
    email: "webmaster@nglawdigestblog.com",
  },
};

// Real editorial board, exactly as listed in the Issue 39 masthead.
export const editorialBoard: EditorialBoardMember[] = [
  {
    name: "Hon Justice S.M.A Belgore",
    credentials: "CON, GCON, FNIALS, LLD (Hon)",
    role: "Former Chief Justice of Nigeria",
  },
  {
    name: "Hon Justice George Oguntade",
    credentials: "CFR, JSC (Rtd)",
    role: "Editorial Board",
  },
  {
    name: "Dr. Anthony C.K Kakoza",
    credentials: "Ph.D",
    role: "Dean, Faculty of Law, Uganda Christian University",
  },
  {
    name: "Kemi Pinheiro",
    credentials: "SAN",
    role: "Founding Partner, Pinheiro LP",
  },
  {
    name: "Professor Dakas CJ Dakas",
    credentials: "Ph.D, SAN",
    role: "Distinguished Professor of Law, Director of Research, NIALS",
  },
  {
    name: "Dr. Uche Ewelukwa Ofodile",
    credentials: "LLM (London, Harvard), SJD (Harvard)",
    role: "Professor of Law, University of Arkansas School of Law",
  },
  {
    name: "Dr. Adetokunbo Derek Obadina",
    credentials: "B.A (Hons) (Sussex), LLM (London), Ph.D (Wales)",
    role: "Dean, Faculty of Law, Lagos State University",
  },
  {
    name: "Prof. Edwin Egede",
    credentials: "LLB (Hons), BL, LLM, Ph.D",
    role: "Senior Lecturer, Cardiff University",
  },
  {
    name: "Njaramba Gichuki",
    role: "Senior Lecturer, University of Nairobi; Member, Editorial Board, East Africa Law Journal",
  },
];

// Canonical, de-duplicated list of every real Issue 39 article referenced on
// the homepage (In This Issue / Featured / Editorial Insights), for routes
// that need the complete set rather than a curated homepage subset.
export const articles: Article[] = [
  {
    slug: "transgenerational-law-firm-practice",
    title: "Transgenerational Law Firm Practice In Nigeria",
    author: { name: "Modupe Olusoga" },
    page: 6,
    practiceArea: "Commercial & Corporate Law",
    imageAlt: "Transgenerational Law Firm Practice In Nigeria",
  },
  {
    slug: "understanding-the-business-of-law",
    title:
      "Understanding The Business of Law: Why Legal Excellence Alone is No Longer Enough",
    author: { name: "Agatha McMuda" },
    page: 14,
    practiceArea: "Commercial & Corporate Law",
    imageAlt: "Understanding The Business of Law",
  },
  {
    slug: "high-stakes-witness-preparation",
    title:
      "Why High-Stakes Witness Preparation May Be the Missing Piece in Nigeria's Governance, Regulatory and Commercial Landscape",
    author: { name: "Genevieve Nwodo Wakeley-Jones" },
    page: 30,
    practiceArea: "Cross-Jurisdictional Litigation",
    imageAlt: "High-Stakes Witness Preparation",
  },
  {
    slug: "can-nigeria-rebuild-its-manufacturing-sector",
    title:
      "Can Nigeria Rebuild Its Manufacturing Sector? What the Dangote-Peugeot Revival Says About Investor Confidence and Industrial Growth",
    author: { name: "Oluwatoyin Modupe Asada" },
    page: 32,
    practiceArea: "Corporate Governance",
    imageAlt: "Can Nigeria Rebuild Its Manufacturing Sector?",
  },
  {
    slug: "beyond-restitution-benin-bronzes",
    title: "Beyond Restitution: Building Bridges with the Benin Bronzes",
    author: { name: "Adedunmade Onibokun" },
    page: 35,
    imageAlt: "Beyond Restitution: Building Bridges with the Benin Bronzes",
  },
  {
    slug: "tourism-development-in-nigeria",
    title:
      "Tourism Development In Nigeria Beyond Showcasing Attractions: Building Structures, Governance Systems, And A Sustainable Economic Framework",
    author: { name: "Kemi Afesojaye" },
    page: 39,
    imageAlt: "Tourism Development In Nigeria",
  },
  {
    slug: "minister-of-power-electric-sector-reform",
    title:
      "The Role of the Minister of Power in Nigerian Electric Power Sector Reform: A Legal Perspective",
    author: { name: "Alfred M. Tijah", credentials: "LL.M" },
    page: 46,
    practiceArea: "Energy & Power Law",
    imageAlt: "The Role of the Minister of Power in Nigerian Electric Power Sector Reform",
  },
];
