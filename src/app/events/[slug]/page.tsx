import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/client";
import { getEventBySlug, getEvents } from "@/lib/supabase/queries/events";
import { Reveal } from "@/components/motion/reveal";

export async function generateStaticParams() {
  try {
    const supabase = createSupabaseServerClient();
    const events = await getEvents(supabase);
    return events.map((event) => ({ slug: event.slug }));
  } catch {
    return [];
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const supabase = createSupabaseServerClient();
  const event = await getEventBySlug(supabase, slug);
  if (!event) return {};

  return {
    title: `${event.title} — Law Digest`,
    description: event.description ?? `Law Digest event: ${event.title}`,
  };
}

export default async function EventPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = createSupabaseServerClient();
  const event = await getEventBySlug(supabase, slug);

  if (!event) notFound();

  const images = event.galleryImages ?? [];

  return (
    <div className="mx-auto max-w-5xl px-6 py-16">
      <Reveal>
        <Link
          href="/events"
          className="inline-block font-utility text-[11px] uppercase tracking-wide text-digest-red transition-opacity hover:opacity-70"
        >
          ← All Events
        </Link>

        <div className="mt-4 flex items-center gap-3">
          {typeof event.pageNumber === "number" ? (
            <span className="inline-flex h-7 min-w-7 items-center justify-center bg-digest-red px-1.5 font-utility text-xs font-medium text-paper">
              p. {event.pageNumber}
            </span>
          ) : null}
          {event.eventDate ? (
            <p className="font-utility text-[11px] uppercase tracking-[0.2em] text-purple">
              {new Date(event.eventDate).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </p>
          ) : null}
        </div>

        <h1 className="mt-3 font-display text-3xl italic text-ink md:text-4xl">
          {event.title}
        </h1>

        {event.description ? (
          <p className="mt-4 max-w-2xl font-body text-base leading-relaxed text-stone">
            {event.description}
          </p>
        ) : null}
      </Reveal>

      {/* Cover image */}
      {event.coverImageUrl ? (
        <Reveal delay={0.08}>
          <div className="relative mt-8 aspect-[16/9] w-full overflow-hidden">
            <Image
              src={event.coverImageUrl}
              alt={event.title}
              fill
              sizes="100vw"
              className="object-cover"
              priority
            />
          </div>
        </Reveal>
      ) : null}

      {/* Gallery */}
      {images.length > 0 ? (
        <Reveal delay={0.12}>
          <div className="mt-12">
            <h2 className="font-utility text-[11px] uppercase tracking-[0.2em] text-purple">
              Gallery
            </h2>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {images.map((img, index) => (
                <Reveal key={img.id} delay={0.12 + index * 0.06}>
                  <div className="group relative overflow-hidden border border-hairline">
                    <div className="relative aspect-[4/3] w-full">
                      <Image
                        src={img.imageUrl}
                        alt={img.caption ?? `${event.title} — Photo ${index + 1}`}
                        fill
                        sizes="(min-width: 1024px) 320px, (min-width: 640px) 50vw, 100vw"
                        className="object-cover transition-transform duration-700 group-hover:scale-105"
                      />
                    </div>
                    {img.caption ? (
                      <p className="px-3 py-2 font-body text-xs text-stone">
                        {img.caption}
                      </p>
                    ) : null}
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </Reveal>
      ) : null}
    </div>
  );
}
