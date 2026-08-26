import Link from "next/link";
import { SectionHeading } from "@/components/ui/section-heading";
import { Reveal } from "@/components/motion/reveal";

export function InsideLawDigest() {
  return (
    <section className="border-t border-hairline bg-ink text-paper">
      <div className="mx-auto max-w-6xl px-6 py-20">
        <Reveal>
          <div className="grid gap-12 md:grid-cols-2 md:items-center">
            <div>
              <p className="font-utility text-[11px] uppercase tracking-[0.2em] text-digest-red">
                § Inside Law Digest
              </p>
              <h2 className="mt-3 font-display text-3xl italic text-paper md:text-4xl">
                Africa&apos;s Premier Law Journal
              </h2>
              <div className="mt-6 space-y-4 font-body text-base leading-relaxed text-stone">
                <p>
                  Law Digest is a quarterly international publication published in the UK and
                  distributed across the US, London, Ghana, South Africa, Canada, Nigeria, and
                  East Africa.
                </p>
                <p>
                  We are the publisher of Africa&apos;s first and only international law magazine
                  aimed at African legal practitioners both home and abroad — featuring
                  international contributors from the major common law jurisdictions.
                </p>
                <p>
                  With over 5,000 copies distributed globally and 50,000+ online readers, Law
                  Digest bridges the gap between legal scholarship and practical legal journalism.
                </p>
              </div>
              <div className="mt-8 flex items-center gap-6">
                <Link
                  href="/about"
                  className="border-b-2 border-digest-red pb-1 font-utility text-[11px] uppercase tracking-wide text-digest-red transition-opacity hover:opacity-70"
                >
                  Learn more about us →
                </Link>
                <Link
                  href="/contributors"
                  className="border-b-2 border-paper/20 pb-1 font-utility text-[11px] uppercase tracking-wide text-stone transition-colors hover:border-paper hover:text-paper"
                >
                  Meet our contributors →
                </Link>
              </div>
            </div>
            <div className="relative">
              {/* Stats grid */}
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: "Founded", value: "2013", sublabel: "London, UK" },
                  { label: "Distribution", value: "7+", sublabel: "Countries worldwide" },
                  { label: "Copies", value: "5,000+", sublabel: "Printed per issue" },
                  { label: "Online", value: "50,000+", sublabel: "Digital readers" },
                ].map((stat) => (
                  <div
                    key={stat.label}
                    className="border border-paper/10 p-4 transition-colors duration-300 hover:border-digest-red"
                  >
                    <p className="font-utility text-[10px] uppercase tracking-[0.2em] text-stone">
                      {stat.label}
                    </p>
                    <p className="mt-1 font-display text-2xl italic text-paper">
                      {stat.value}
                    </p>
                    <p className="mt-1 font-utility text-[10px] uppercase tracking-wide text-stone">
                      {stat.sublabel}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
