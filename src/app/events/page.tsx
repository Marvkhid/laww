import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { createSupabaseServerClient } from "@/lib/supabase/client";
import { getEvents } from "@/lib/supabase/queries/events";
import { SectionHeading } from "@/components/ui/section-heading";
import { Reveal } from "@/components/motion/reveal";

export const metadata: Metadata = {
  title: "Events — Law Digest",
  description: "Law Digest events, conferences, and gatherings.",
  alternates: { canonical: "/events" },
};

export default async function EventsPage() {
  const supabase = createSupabaseServerClient();
  const events = await getEvents(supabase);

  return (
    <div className="mx-auto max-w-6xl px-6 py-16">
      <Reveal>
        <SectionHeading eyebrow="Events" title="Law Digest Events" />
        <p className="max-w-2xl font-body text-base leading-relaxed text-stone">
          Law Digest events spotlight the programmes, conferences, and editorial
          activities that bring Nigeria&rsquo;s legal community together. Browse
          highlights from past gatherings and stay informed about upcoming
          occasions that matter to practitioners, academics, and the wider
          public.
        </p>
      </Reveal>

      {events.length === 0 ? (
        <Reveal delay={0.08}>
          <p className="max-w-lg font-body text-sm leading-relaxed text-stone">
            No events have been published yet. Check back soon for Law Digest gatherings,
            conferences, and editorial events.
          </p>
        </Reveal>
      ) : (
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {events.map((event, index) => (
            <Reveal key={event.slug} delay={index * 0.08}>
              <Link
                href={`/events/${event.slug}`}
                className="group block overflow-hidden border border-hairline transition-shadow duration-300 hover:shadow-lg"
              >
                <div className="relative aspect-[16/10] overflow-hidden">
                  {event.coverImageUrl ? (
                    <Image
                      src={event.coverImageUrl}
                      alt={event.title}
                      fill
                      sizes="(min-width: 1024px) 380px, (min-width: 640px) 50vw, 100vw"
                      className="object-contain transition-transform duration-700 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-hairline/60">
                      <span className="font-utility text-[10px] uppercase tracking-wide text-stone">
                        No image
                      </span>
                    </div>
                  )}
                </div>
                <div className="p-5">
                  <div className="flex items-center gap-2">
                    {typeof event.pageNumber === "number" ? (
                      <span className="inline-flex h-6 min-w-6 items-center justify-center bg-digest-red px-1 font-utility text-[10px] font-medium text-paper">
                        p. {event.pageNumber}
                      </span>
                    ) : null}
                    {event.eventDate ? (
                      <p className="font-utility text-[10px] uppercase tracking-wide text-purple">
                        {new Date(event.eventDate).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })}
                      </p>
                    ) : null}
                  </div>
                  <h2 className="mt-2 font-display text-xl italic text-ink transition-colors duration-300 group-hover:text-digest-red">
                    {event.title}
                  </h2>
                  {event.description ? (
                    <p className="mt-2 line-clamp-2 font-body text-sm leading-relaxed text-stone">
                      {event.description}
                    </p>
                  ) : null}
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
      )}
    </div>
  );
}
