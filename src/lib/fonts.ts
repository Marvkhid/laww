import localFont from "next/font/local";

// Self-hosted rather than next/font/google: both this sandbox and at least
// one real environment (report from Aug 2026) can't reach fonts.googleapis.com
// at build time, and next/font's own error message recommends this exact fix.

// Display — headlines, hero name treatment, section dividers.
// Merriweather: a sturdy, authoritative serif designed for screen readability.
// Excellent for editorial headings in a legal publication.
export const merriweather = localFont({
  src: [
    { path: "../fonts/merriweather/Merriweather-Regular.ttf", weight: "400", style: "normal" },
    { path: "../fonts/merriweather/Merriweather-Bold.ttf", weight: "700", style: "normal" },
    { path: "../fonts/merriweather/Merriweather-Italic.ttf", weight: "400", style: "italic" },
  ],
  variable: "--font-display",
  display: "swap",
});

// Body — long-form reading text: deks, excerpts, editor's letter, pull quotes.
// Source Serif 4: a modern, highly readable serif designed for extended reading.
// Excellent for legal articles and long-form editorial content.
export const sourceSerif4 = localFont({
  src: [
    { path: "../fonts/source-serif-4/SourceSerif4-Variable.ttf", weight: "200 900", style: "normal" },
    { path: "../fonts/source-serif-4/SourceSerif4-Italic-Variable.ttf", weight: "200 900", style: "italic" },
  ],
  variable: "--font-body",
  display: "swap",
});

// UI — nav, buttons, form chrome. Never used for reading text.
// Inter: a clean, modern sans-serif optimized for screen readability.
// Excellent for UI elements, navigation, and form controls.
export const inter = localFont({
  src: [
    { path: "../fonts/inter/Inter-Regular.ttf", weight: "400", style: "normal" },
    { path: "../fonts/inter/Inter-SemiBold.ttf", weight: "600", style: "normal" },
  ],
  variable: "--font-ui",
  display: "swap",
});

// Utility — bylines, dates, page-number badges, category labels.
// IBM Plex Mono: a professional monospace font for utility text.
export const ibmPlexMono = localFont({
  src: [
    { path: "../fonts/ibm-plex-mono/IBMPlexMono-Regular.ttf", weight: "400", style: "normal" },
    { path: "../fonts/ibm-plex-mono/IBMPlexMono-Medium.ttf", weight: "500", style: "normal" },
  ],
  variable: "--font-utility",
  display: "swap",
});
