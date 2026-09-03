import Link from "next/link";
import { SectionHeading } from "@/components/ui/section-heading";
import { Reveal } from "@/components/motion/reveal";

export function InsideLawDigest() {
  return (
    <section className="border-t border-hairline bg-digest-red text-paper">
      <div className="mx-auto max-w-6xl px-6 py-20">
        <Reveal>
          <div className="grid gap-12 md:grid-cols-2 md:items-center">
            <div>
              <p className="font-utility text-[11px] uppercase tracking-[0.2em] text-white/60">
                § Inside Law Digest
              </p>
              <h2 className="mt-3 font-display text-3xl italic text-white md:text-4xl">
                Africa&apos;s Premier Law Journal
              </h2>
              <div className="mt-6 space-y-4 font-body text-base italic leading-relaxed text-white/90">
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
                  className="group border-b-2 border-white pb-1 font-utility text-[11px] uppercase tracking-wide text-white transition-all duration-300 hover:border-white/50 hover:text-white/80"
                >
                  Learn more about us →
                </Link>
                <Link
                  href="/contributors"
                  className="group border-b-2 border-white/30 pb-1 font-utility text-[11px] uppercase tracking-wide text-white/70 transition-all duration-300 hover:border-white hover:text-white"
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
                    className="border border-white/[0.12] bg-white/[0.06] p-5 transition-all duration-300 hover:border-white/40 hover:bg-white/[0.12]"
                  >
                    <p className="font-utility text-[10px] uppercase tracking-[0.2em] text-white/75">
                      {stat.label}
                    </p>
                    <p className="mt-2 font-display text-2xl italic text-paper">
                      {stat.value}
                    </p>
                    <p className="mt-1 font-utility text-[10px] font-medium uppercase tracking-wide text-white/65">
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
