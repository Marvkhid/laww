import { CoverHero } from "@/components/home/cover-hero";
import { CoverStory } from "@/components/home/cover-story";
import { InThisIssue } from "@/components/home/in-this-issue";
import { FeaturedStories } from "@/components/home/featured-stories";
import { LatestStories } from "@/components/home/latest-stories";
import { PracticeAreas } from "@/components/home/practice-areas";
import { EditorialInsights } from "@/components/home/editorial-insights";
import { Contributors } from "@/components/home/contributors";
import { IssueShowcase } from "@/components/home/issue-showcase";
import { CallForPapers } from "@/components/home/call-for-papers";
import { Sponsors } from "@/components/home/sponsors";
import { IssuesArchiveStrip } from "@/components/home/issues-archive-strip-server";
import { Newsletter } from "@/components/home/newsletter";
import { AdPlacement } from "@/components/home/ad-placement";
import { InsideLawDigest } from "@/components/home/inside-lawdigest";
import { LegalQuizServer } from "@/components/home/legal-quiz-server";
import { ThisWeekInLaw } from "@/components/home/this-week-in-law";
import { HomepageHighlightsServer } from "@/components/home/homepage-highlights-server";

export default function Home() {
  return (
    <>
      {/* 1. Hero / Featured Story */}
      <CoverHero />

      {/* 1b. Cover Story — Lawyer in the News interview */}
      <CoverStory />

      {/* 2. Featured Stories */}
      <FeaturedStories />

      {/* 3. Latest Legal Updates */}
      <ThisWeekInLaw />

      {/* 4. Editorial Insights / Blog */}
      <EditorialInsights />

      {/* 5. Interactive Legal Questions of the Day (Admin-managed quiz) */}
      <LegalQuizServer />

      {/* 6. Homepage Highlights (Admin-managed) */}
      <HomepageHighlightsServer />

      {/* 7. In This Issue */}
      <InThisIssue />

      {/* 8. Inside LawDigest */}
      <InsideLawDigest />

      {/* 9. Practice Areas */}
      <PracticeAreas />

      {/* 10. Contributors */}
      <Contributors />

      {/* 11. Issue Showcase / PDF */}
      <IssueShowcase />

      {/* 11b. Call for Papers — latest issue's submission call */}
      <CallForPapers />

      {/* 12. Sponsors */}
      <Sponsors />

      {/* 13. Issues Archive Strip */}
      <IssuesArchiveStrip />

      {/* 14. Newsletter */}
      <Newsletter />

      {/* Ads */}
      <AdPlacement placement="homepage" />
    </>
  );
}
