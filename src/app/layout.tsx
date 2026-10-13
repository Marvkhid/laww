import type { Metadata } from "next";
import { Suspense } from "react";
import { merriweather, sourceSerif4, ibmPlexMono } from "@/lib/fonts";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { BootFlag } from "@/components/layout/boot-flag";
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
        {/*
          Reveal watchdog. Every animated block is server-rendered at
          `opacity: 0` and only fades in once the client bundle boots. If the
          bundle never boots — stale cached chunk after a deploy, a blocked or
          failed script, a hydration exception — the page stays invisible.

          The rescue is a stylesheet this script installs, NOT a change to the
          document it finds. It must not touch `class` or `style` on any
          element React renders: 2.5s is not long enough to tell "the bundle
          will never boot" from "the bundle is slow" (a cold dev compile, a
          slow device, a slow network), and when hydration lands after this
          timer the attributes rewritten here are exactly the ones React
          compares — reported as "A tree hydrated but some attributes … didn't
          match. This won't be patched up." A sheet created here adds no node
          and no attribute, so the page can be rescued at 2.5s and still
          hydrate cleanly a second later. Because it is its own sheet it also
          works when the page stylesheet never loaded (which is why it cannot
          live in globals.css — a blocked /_next/static removes that too).

          The declarations are what the old `html.no-hydration` rules did:
          reveal blocks and their direct children become visible
          (`StaggerItem` renders `opacity: 0` inline without carrying
          `data-reveal`), and a transform is cleared only on a child that
          carries one inline — i.e. animation state, not class-driven layout.

          BootFlag clears the timer when React mounts. Inline so it runs even
          when /_next/static is unreachable, and synchronous so it is armed
          before <body> parses.
        */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              'window.__ngRevealWatchdog=setTimeout(function(){' +
              'var css="[data-reveal]{opacity:1!important;transform:none!important}"+' +
              '"[data-reveal]>*{opacity:1!important}"+' +
              '"[data-reveal]>*[style*=translate]{transform:none!important}";' +
              'try{' +
              'if(document.adoptedStyleSheets&&typeof CSSStyleSheet==="function"){' +
              'var sh=new CSSStyleSheet();sh.replaceSync(css);' +
              'document.adoptedStyleSheets=document.adoptedStyleSheets.concat(sh);' +
              '}else{' +
              'var st=document.createElement("style");st.textContent=css;' +
              '(document.head||document.documentElement).appendChild(st);' +
              '}' +
              'window.__ngRevealRescued=1;' +
              '}catch(e){}' +
              '},2500)',
          }}
        />
      </head>
      <body className="flex min-h-screen flex-col bg-paper text-ink">
        <BootFlag />
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
        <main id="main-content" className="flex-1">
          {/*
            Shown only when scripting is disabled (see globals.css). Without
            JavaScript React's streamed content never swaps in, so the page
            would otherwise sit on its loading skeleton forever — an infinite
            spinner with no explanation. This turns that state into an
            actionable message. Hidden outright when JS is available.
          */}
          <p className="nojs-notice" role="status">
            JavaScript is disabled on this browser. This site loads its
            articles and images with JavaScript, so the page cannot be
            displayed — please enable JavaScript and reload.
          </p>
          {children}
        </main>
        <Footer />
        <CookieConsent />
      </body>
    </html>
  );
}
