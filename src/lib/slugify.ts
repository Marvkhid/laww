/**
 * Generate a URL-safe slug from arbitrary text.
 *
 * Rules:
 *  - Lowercase
 *  - Strip non-alphanumeric characters (keeps hyphens)
 *  - Collapse runs of hyphens
 *  - Trim leading/trailing hyphens
 *  - Cap at 120 characters
 *  - Deterministic — same input always produces the same output
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/['']/g, "")          // remove apostrophes
    .replace(/[^a-z0-9]+/g, "-")   // non-alphanum → hyphen
    .replace(/-{2,}/g, "-")        // collapse consecutive hyphens
    .replace(/^-|-$/g, "")         // trim edges
    .slice(0, 120);
}
