"use client";

import { useState, useCallback } from "react";
import { Link2, Share2, ExternalLink } from "lucide-react";

export function ShareControls({
  title,
  url,
}: {
  title: string;
  url: string;
}) {
  const [copied, setCopied] = useState(false);

  const copyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: select text
      const input = document.createElement("input");
      input.value = url;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [url]);

  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);

  return (
    <div className="flex items-center gap-3">
      <span className="font-utility text-[10px] uppercase tracking-wide text-stone">
        Share
      </span>

      <button
        type="button"
        onClick={copyLink}
        className="flex h-8 w-8 items-center justify-center border border-hairline text-stone transition-colors hover:border-digest-red hover:text-digest-red"
        title={copied ? "Copied!" : "Copy link"}
        aria-label={copied ? "Link copied to clipboard" : "Copy link to clipboard"}
      >
        <Link2 size={14} />
      </button>

      <a
        href={`https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`}
        target="_blank"
        rel="noopener noreferrer"
        className="flex h-8 w-8 items-center justify-center border border-hairline text-stone transition-colors hover:border-digest-red hover:text-digest-red"
        title="Share on X"
        aria-label="Share on X (Twitter)"
      >
        <Share2 size={14} />
      </a>

      <a
        href={`https://www.linkedin.com/shareArticle?mini=true&url=${encodedUrl}&title=${encodedTitle}`}
        target="_blank"
        rel="noopener noreferrer"
        className="flex h-8 w-8 items-center justify-center border border-hairline text-stone transition-colors hover:border-digest-red hover:text-digest-red"
        title="Share on LinkedIn"
        aria-label="Share on LinkedIn"
      >
        <ExternalLink size={14} />
      </a>

      <a
        href={`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`}
        target="_blank"
        rel="noopener noreferrer"
        className="flex h-8 w-8 items-center justify-center border border-hairline text-stone transition-colors hover:border-digest-red hover:text-digest-red"
        title="Share on Facebook"
        aria-label="Share on Facebook"
      >
        <Share2 size={14} />
      </a>
    </div>
  );
}
