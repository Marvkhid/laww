import type { MetadataRoute } from "next";
import { createSupabaseServerClient } from "@/lib/supabase/client";
import { getArticles } from "@/lib/supabase/queries/articles";
import { getContributors } from "@/lib/supabase/queries/contributors";
import { getPracticeAreas } from "@/lib/supabase/queries/practice-areas";
import { getCurrentIssue } from "@/lib/supabase/queries/issues";
import { getPublishedLegalUpdates } from "@/lib/supabase/queries/legal-updates";
import { listPublishedLawyerNews } from "@/lib/supabase/queries/lawyer-news";
import { SITE_URL } from "@/lib/constants";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: SITE_URL, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/articles`, changeFrequency: "daily", priority: 0.8 },
    { url: `${SITE_URL}/practice-areas`, changeFrequency: "weekly", priority: 0.6 },
    { url: `${SITE_URL}/contributors`, changeFrequency: "weekly", priority: 0.6 },
    { url: `${SITE_URL}/issues`, changeFrequency: "weekly", priority: 0.6 },
    { url: `${SITE_URL}/legal-updates`, changeFrequency: "daily", priority: 0.7 },
    { url: `${SITE_URL}/lawyer-in-the-news`, changeFrequency: "weekly", priority: 0.6 },
    { url: `${SITE_URL}/about`, changeFrequency: "monthly", priority: 0.3 },
    { url: `${SITE_URL}/contact`, changeFrequency: "monthly", priority: 0.3 },
  ];

  // Same fallback philosophy as generateStaticParams elsewhere in the app:
  // if the DB isn't reachable at build time, ship the static routes rather
  // than failing the whole sitemap.
  try {
    const supabase = createSupabaseServerClient();
    const [articles, contributors, practiceAreas, issue, legalUpdates, interviews] = await Promise.all([
      getArticles(supabase),
      getContributors(supabase),
      getPracticeAreas(supabase),
      getCurrentIssue(supabase),
      getPublishedLegalUpdates(supabase, 100),
      listPublishedLawyerNews(supabase),
    ]);

    const dynamicRoutes: MetadataRoute.Sitemap = [
      ...articles.map((article) => ({
        url: `${SITE_URL}/articles/${article.slug}`,
        changeFrequency: "monthly" as const,
        priority: 0.7,
      })),
      ...contributors.map((contributor) => ({
        url: `${SITE_URL}/contributors/${contributor.slug}`,
        changeFrequency: "monthly" as const,
        priority: 0.5,
      })),
      ...practiceAreas.map((practiceArea) => ({
        url: `${SITE_URL}/practice-areas/${practiceArea.slug}`,
        changeFrequency: "monthly" as const,
        priority: 0.5,
      })),
      ...legalUpdates.map((update) => ({
        url: `${SITE_URL}/legal-updates/${update.slug}`,
        changeFrequency: "monthly" as const,
        priority: 0.6,
      })),
      ...interviews.map((interview) => ({
        url: `${SITE_URL}/lawyer-in-the-news/${interview.slug}`,
        changeFrequency: "monthly" as const,
        priority: 0.6,
      })),
      ...(issue
        ? [
            {
              url: `${SITE_URL}/issues/issue-${issue.issueNumber}`,
              changeFrequency: "monthly" as const,
              priority: 0.6,
            },
          ]
        : []),
    ];

    return [...staticRoutes, ...dynamicRoutes];
  } catch {
    return staticRoutes;
  }
}
