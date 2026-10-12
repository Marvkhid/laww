/**
 * Upload destinations — ONE whitelist shared by the browser uploader and the
 * server action that mints signed upload URLs.
 *
 * The browser can only ever name a section from this list, and the server
 * checks the same list, so an upload can never be aimed at an arbitrary folder
 * or at a section that does not handle that kind of file (e.g. a PDF into the
 * highlights folder). The object path itself is still generated server-side.
 */

export type UploadKind = "image" | "pdf";

export const UPLOAD_FOLDERS = {
  articles: ["image"],
  events: ["image"],
  // Issues and archive editions carry a cover image AND a digital-edition PDF.
  issues: ["image", "pdf"],
  archive: ["image", "pdf"],
  "lawyer-news": ["image"],
  "legal-updates": ["image"],
  "legal-insights": ["image"],
  highlights: ["image"],
  "practice-areas": ["image"],
  sponsors: ["image"],
  contributors: ["image"],
} as const satisfies Record<string, readonly UploadKind[]>;

export type UploadFolder = keyof typeof UPLOAD_FOLDERS;

/** The kinds a section accepts, or null when the section is unknown. */
export function allowedKindsFor(folder: string): readonly UploadKind[] | null {
  if (!Object.prototype.hasOwnProperty.call(UPLOAD_FOLDERS, folder)) return null;
  return UPLOAD_FOLDERS[folder as UploadFolder] as readonly UploadKind[];
}
