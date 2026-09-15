import type { Metadata } from "next";
import { Suspense } from "react";
import { merriweather, sourceSerif4, ibmPlexMono } from "@/lib/fonts";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { CookieConsent } from "@/components/layout/cookie-consent";
import { RouteLoadingBar } from "@/components/layout/route-loading-bar";
import { RouteVisibility } from "@/components/layout/route-visibility";
import {
  BreakingLegalUpdates,
  BreakingLegalUpdatesSkeleton,
} from "@/components/home/breaking-legal-updates";
import { SITE_URL } from "@/lib/constants";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "NG Law Digest — Nigerian Legal News, Updates & Insights",
    template: "%s — NG Law Digest",
  },
  description:
    "NG Law Digest is Nigeria's leading legal publication, covering legal practice, policy updates, and in-depth analysis across Nigeria and beyond.",
  metadataBase: new URL(SITE_URL),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: SITE_URL,
    siteName: "NG Law Digest",
    title: "NG Law Digest — Nigerian Legal News, Updates & Insights",
    description:
      "NG Law Digest is Nigeria's leading legal publication, covering legal practice, policy updates, and in-depth analysis across Nigeria and beyond.",
    images: [
      {
        url: "/images/og-default.jpg",
        width: 1200,
        height: 630,
        alt: "NG Law Digest — Nigerian Legal News, Updates & Insights",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "NG Law Digest — Nigerian Legal News, Updates & Insights",
    description:
      "NG Law Digest is Nigeria's leading legal publication, covering legal practice, policy updates, and in-depth analysis across Nigeria and beyond.",
    images: ["/images/og-default.jpg"],
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "NG Law Digest",
  url: SITE_URL,
  description:
    "Nigeria's leading legal publication covering legal practice, policy updates, and in-depth analysis.",
  publisher: {
    "@type": "Organization",
    name: "NG Law Digest",
    url: SITE_URL,
    logo: {
      "@type": "ImageObject",
      url: `${SITE_URL}/images/og-default.jpg`,
    },
  },
  potentialAction: {
    "@type": "SearchAction",
    target: `${SITE_URL}/search?q={search_term_string}`,
    "query-input": "required name=search_term_string",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`${merriweather.variable} ${sourceSerif4.variable} ${ibmPlexMono.variable} antialiased`}
    >
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="flex min-h-screen flex-col bg-paper text-ink">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[100] focus:bg-digest-red focus:px-4 focus:py-2 focus:text-sm focus:text-paper focus:outline-none"
        >
          Skip to main content
        </a>
        <RouteLoadingBar />
        <Header />
        <RouteVisibility except="/admin">
          <Suspense fallback={<BreakingLegalUpdatesSkeleton />}>
            <BreakingLegalUpdates />
          </Suspense>
        </RouteVisibility>
        <main id="main-content" className="flex-1">{children}</main>
        <Footer />
        <CookieConsent />
      </body>
    </html>
  );
}
