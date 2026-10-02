import Link from "next/link";
import Image from "next/image";
import { createSupabaseServerClient } from "@/lib/supabase/client";
import { getHomepageEvents } from "@/lib/supabase/queries/events";
import { SectionHeading } from "@/components/ui/section-heading";
import { Reveal } from "@/components/motion/reveal";

/**
 * Homepage events.
 *
 * Reads published event rows straight from the database, filtered by the
 * same show_on_pages column the admin form writes — so ticking
 * "Display On → Homepage" for an event is what puts it here. There is no
 * separate hand-maintained homepage event list to drift out of sync.
 */
export async function HomepageEvents() {
  const supabase = createSupabaseServerClient();
  const events = await getHomepageEvents(supabase, 4);

  if (events.length === 0) return null;

  return (
    <section className="border-t border-hairline">
      <div className="mx-auto max-w-6xl px-6 py-20">
        <Reveal>
          <div className="flex items-end justify-between">
            <SectionHeading eyebrow="Events" title="Upcoming & recent events" />
            <Link
              href="/events"
              className="hidden border-b border-digest-red pb-1 font-utility text-[11px] uppercase tracking-wide text-digest-red transition-opacity hover:opacity-70 md:block"
            >
              View all events →
            </Link>
          </div>
        </Reveal>

        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {events.map((event, index) => (
            <Reveal key={event.slug} delay={index * 0.06}>
              <Link
                href={`/events/${event.slug}`}
                className="group block overflow-hidden border border-hairline transition-shadow duration-300 hover:shadow-lg"
              >
                <div className="relative aspect-[16/10] overflow-hidden">
                  {event.coverImageUrl ? (
                    <div className="relative aspect-[16/10] w-full overflow-hidden">
                      <Image
                        src={event.coverImageUrl}
                        alt={event.title}
                        fill
                        sizes="(min-width: 1024px) 280px, (min-width: 640px) 50vw, 100vw"
                        className="block h-auto w-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-hairline/60">
                      <span className="font-utility text-[10px] uppercase tracking-wide text-stone">
                        No image
                      </span>
                    </div>
                  )}
                </div>
                <div className="p-4">
                  {event.eventDate ? (
                    <p className="font-utility text-[10px] uppercase tracking-wide text-purple">
                      {new Date(event.eventDate).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </p>
                  ) : null}
                  <h3 className="mt-1.5 font-display text-lg italic text-ink transition-colors duration-300 group-hover:text-digest-red">
                    {event.title}
                  </h3>
                  {event.description ? (
                    <p className="mt-1.5 line-clamp-2 font-body text-sm leading-relaxed text-stone">
                      {event.description}
                    </p>
                  ) : null}
                </div>
              </Link>
            </Reveal>
          ))}
        </div>

        <div className="mt-6 text-center md:hidden">
          <Link
            href="/events"
            className="border-b border-digest-red pb-1 font-utility text-[11px] uppercase tracking-wide text-digest-red transition-opacity hover:opacity-70"
          >
            View all events →
          </Link>
        </div>
      </div>
    </section>
  );
}
