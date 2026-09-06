import { NewsletterForm } from "@/components/forms/newsletter-form";
import { Reveal } from "@/components/motion/reveal";
import { OpenBook } from "@/components/ui/editorial-illustration";

export function Newsletter() {
  return (
    <section className="border-t border-hairline bg-digest-red text-paper">
      <div className="mx-auto max-w-6xl px-6 py-20">
        <Reveal>
          <div className="grid gap-12 md:grid-cols-2 md:items-center">
            <div>
              <div className="flex items-end gap-6">
                <p className="font-utility text-[11px] uppercase tracking-[0.2em] text-white/70">
                  Newsletter
                </p>
                <OpenBook className="h-16 w-16 shrink-0 text-white/40" />
              </div>
              <h2 className="mt-3 font-display text-3xl italic text-paper md:text-4xl">
                The Weekly Brief
              </h2>
              <p className="mt-4 max-w-md font-body text-base leading-relaxed text-white/85">
                Legal analysis and Law Digest updates, straight from the editorial team.
                Subscribe for curated insights delivered to your inbox.
              </p>
            </div>
            <div>
              <NewsletterForm />
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
