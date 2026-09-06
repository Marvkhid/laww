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

// UI — REMOVED. The Inter webfont (previously mounted here as --font-ui) was
// dropped site-wide in favor of the clean system UI stack defined directly on
// --font-ui in globals.css. layout.tsx no longer mounts `inter`, and the TTFs
// were deleted. Every `font-admin` usage now resolves to the system stack.
// `inter` is kept as a named export only so any stale import fails loudly at
// build time instead of silently rendering an unstyled variable.
export const inter = undefined as never;

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
