import { SectionHeading } from "@/components/ui/section-heading";
import { NewsletterForm } from "@/components/forms/newsletter-form";
import { Reveal } from "@/components/motion/reveal";
import { OpenBook } from "@/components/ui/editorial-illustration";

export function Newsletter() {
  return (
    <section className="border-t border-hairline bg-paper">
      <div className="mx-auto max-w-6xl px-6 py-20">
        <Reveal>
          <div className="grid gap-12 md:grid-cols-2 md:items-center">
            <div>
              <div className="flex items-end gap-6">
                <SectionHeading eyebrow="Newsletter" title="The Weekly Brief" />
                <OpenBook className="h-16 w-16 shrink-0 opacity-20" />
              </div>
              <p className="max-w-md font-body text-base leading-relaxed text-stone">
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
