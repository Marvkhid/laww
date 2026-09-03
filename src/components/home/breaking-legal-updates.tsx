import { createSupabaseServerClient } from "@/lib/supabase/client";
import { getPublishedLegalUpdates } from "@/lib/supabase/queries/legal-updates";
import { Reveal } from "@/components/motion/reveal";

function relativeTime(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const hours = Math.round(diffMs / (1000 * 60 * 60));
  if (hours < 1) return "just now";
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

export async function BreakingLegalUpdates() {
  const supabase = createSupabaseServerClient();
  const updates = await getPublishedLegalUpdates(supabase, 10);

  if (updates.length === 0) {
    return null;
  }

  // Duplicate items for seamless loop — the CSS marquee translates by -50%
  const items = [...updates, ...updates];

  // Estimate duration: ~40 chars per item at scrolling speed
  const duration = Math.max(20, updates.length * 6);

  return (
    <Reveal y={0}>
      <section
        className="relative overflow-hidden border-y-2 border-digest-red bg-digest-red"
        role="marquee"
        aria-label="Breaking legal updates"
      >
        {/* Scanline overlay for editorial texture */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.04]"
          aria-hidden="true"
          style={{
            backgroundImage:
              "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.15) 2px, rgba(0,0,0,0.15) 3px)",
          }}
        />

        <div className="flex items-stretch">
          {/* BREAKING badge — fixed on the left */}
          <div className="relative z-10 flex shrink-0 items-center gap-2.5 bg-digest-red-deep px-5 py-3.5 sm:px-7">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-60" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-white" />
            </span>
            <span className="font-utility text-[11px] font-bold uppercase tracking-[0.25em] text-white sm:text-xs">
              Breaking
            </span>
          </div>

          {/* Scrolling ticker */}
          <div className="relative flex-1 overflow-hidden py-3.5">
            {/* Left fade */}
            <div
              className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-linear-to-r from-digest-red to-transparent"
              aria-hidden="true"
            />
            {/* Right fade */}
            <div
              className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-linear-to-l from-digest-red to-transparent"
              aria-hidden="true"
            />

            <div
              className="marquee-track"
              style={{ "--marquee-duration": `${duration}s` } as React.CSSProperties}
            >
              {items.map((update, index) => (
                <a
                  key={`${update.id}-${index}`}
                  href={`/legal-updates/${update.slug}`}
                  className="group/item flex shrink-0 items-center px-6 transition-opacity hover:opacity-80"
                >
                  {/* Separator dot */}
                  <span
                    className="mr-6 inline-block h-1.5 w-1.5 rotate-45 bg-white/50"
                    aria-hidden="true"
                  />

                  {/* Headline */}
                  <span className="whitespace-nowrap font-admin text-sm font-semibold text-white sm:text-[15px]">
                    {update.headline}
                  </span>

                  {/* Source + time */}
                  <span className="ml-3 whitespace-nowrap font-utility text-[10px] font-medium uppercase tracking-wide text-white/75">
                    {update.sourceName} · {relativeTime(update.publishedAt)}
                  </span>

                  {update.practiceArea ? (
                    <span className="ml-2 whitespace-nowrap rounded-sm border border-white/20 px-1.5 py-0.5 font-utility text-[9px] uppercase tracking-wider text-white/60">
                      § {update.practiceArea}
                    </span>
                  ) : null}
                </a>
              ))}
            </div>
          </div>
        </div>
      </section>
    </Reveal>
  );
}

export function BreakingLegalUpdatesSkeleton() {
  return (
    <section className="relative overflow-hidden border-y-2 border-digest-red bg-digest-red">
      <div className="flex items-stretch">
        <div className="flex shrink-0 items-center gap-2.5 bg-digest-red-deep px-5 py-3.5 sm:px-7">
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-white" />
          <span className="font-utility text-[11px] font-bold uppercase tracking-[0.25em] text-white sm:text-xs">
            Breaking
          </span>
        </div>
        <div className="flex flex-1 items-center gap-4 overflow-hidden py-3.5 pl-6">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-4 shrink-0 animate-pulse rounded bg-white/20"
              style={{ width: `${200 + i * 60}px` }}
              aria-hidden="true"
            />
          ))}
        </div>
      </div>
    </section>
  );
}
