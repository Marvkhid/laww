"use client";

import { Link2 } from "lucide-react";
import { useState } from "react";

function SocialIcon({
  children,
  href,
  label,
}: {
  children: React.ReactNode;
  href: string;
  label: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      className="flex h-9 w-9 items-center justify-center border border-hairline text-stone transition-all duration-200 hover:border-digest-red hover:text-digest-red"
    >
      {children}
    </a>
  );
}

export function SocialShareIcons({
  title,
  url,
}: {
  title: string;
  url: string;
}) {
  const [copied, setCopied] = useState(false);

  function copyLink() {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const encoded = {
    title: encodeURIComponent(title),
    url: encodeURIComponent(url),
  };

  return (
    <div className="flex items-center gap-2">
      <SocialIcon
        href={`https://www.facebook.com/sharer/sharer.php?u=${encoded.url}`}
        label="Share on Facebook"
      >
        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" /></svg>
      </SocialIcon>
      <SocialIcon
        href={`https://twitter.com/intent/tweet?url=${encoded.url}&text=${encoded.title}`}
        label="Share on Twitter"
      >
        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
      </SocialIcon>
      <SocialIcon
        href={`https://www.linkedin.com/sharing/share-offsite/?url=${encoded.url}`}
        label="Share on LinkedIn"
      >
        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" /><rect x="2" y="9" width="4" height="12" /><circle cx="4" cy="4" r="2" /></svg>
      </SocialIcon>
      <button
        type="button"
        onClick={copyLink}
        aria-label={copied ? "Copied!" : "Copy link"}
        className="flex h-9 w-9 items-center justify-center border border-hairline text-stone transition-all duration-200 hover:border-digest-red hover:text-digest-red"
      >
        <Link2 className="h-4 w-4" strokeWidth={1.5} />
      </button>
      {copied ? (
        <span className="font-utility text-[10px] uppercase tracking-wide text-digest-red">
          Copied!
        </span>
      ) : null}
    </div>
  );
}
