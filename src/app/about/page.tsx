import type { Metadata } from "next";
import { masthead } from "@/lib/content/issue-39";
import { createSupabaseServerClient } from "@/lib/supabase/client";
import { getEditorialBoard } from "@/lib/supabase/queries/contributors";
import { SectionHeading } from "@/components/ui/section-heading";
import { Reveal } from "@/components/motion/reveal";

export const metadata: Metadata = {
  title: "About — Law Digest",
  description:
    "Law Digest is Africa's premier law journal — legal practice, policy, and commentary across Nigeria and beyond. Learn about our mission, editorial team, and vision.",
  alternates: { canonical: "/about" },
};

export default async function AboutPage() {
  const supabase = createSupabaseServerClient();
  const editorialBoard = await getEditorialBoard(supabase);

  return (
    <div className="mx-auto max-w-6xl px-6 py-16">
      {/* Hero Section */}
      <Reveal>
        <div className="mb-16">
          <SectionHeading eyebrow="About" title="Africa's Premier Law Journal" />
          <p className="mt-6 max-w-3xl font-body text-lg leading-relaxed text-stone">
            Law Digest is a quarterly international publication published in the UK and distributed
            in the US, London, Ghana, South Africa, Canada, Nigeria, and East Africa.
          </p>
        </div>
      </Reveal>

      {/* Who We Are */}
      <Reveal delay={0.05}>
        <section className="mb-20 max-w-3xl">
          <h2 className="font-utility text-[11px] uppercase tracking-[0.2em] text-digest-red">
            Who We Are
          </h2>
          <div className="mt-6 space-y-4 font-body text-base leading-relaxed text-stone">
            <p>
              Law Digest is a unique professional media group, and the publisher of Africa&apos;s
              first and only international law magazine aimed at African legal practitioners both
              home and abroad.
            </p>
            <p>
              The magazine was launched in London on the 10th January 2013 and has set a precedent
              for featuring international contributors from the major common law jurisdictions
              including the US, Canada, and UK.
            </p>
            <p>
              Over 5,000 copies of the journal are distributed in Nigeria, UK, Ghana, Canada,
              East Africa, and the US. No other publication in the law magazine sector offers the
              range of readers&apos; interface offered by Law Digest.
            </p>
          </div>
        </section>
      </Reveal>

      {/* Key facts */}
      <Reveal delay={0.08}>
        <section className="mb-20 border-y border-hairline py-12">
          <div className="grid gap-8 sm:grid-cols-2 md:grid-cols-4">
            {[
              { label: "Founded", value: "2013" },
              { label: "Copies Distributed", value: "5,000+" },
              { label: "Online Audience", value: "50,000+" },
              { label: "Countries", value: "7+" },
            ].map((item) => (
              <div key={item.label} className="text-center">
                <p className="font-utility text-[10px] uppercase tracking-[0.2em] text-stone">
                  {item.label}
                </p>
                <p className="mt-2 font-display text-2xl italic text-ink">
                  {item.value}
                </p>
              </div>
            ))}
          </div>
        </section>
      </Reveal>

      {/* Who We Serve */}
      <Reveal delay={0.1}>
        <section className="mb-20 max-w-3xl">
          <h2 className="font-utility text-[11px] uppercase tracking-[0.2em] text-digest-red">
            Who We Serve
          </h2>
          <div className="mt-6 space-y-4 font-body text-base leading-relaxed text-stone">
            <p>
              Law Digest serves practicing lawyers, judges, in-house counsel, legal academics,
              policymakers, business leaders, and anyone with a professional interest in how law
              operates in Africa.
            </p>
            <p>
              Our readership spans Nigeria, the United Kingdom, Ghana, Canada, East Africa, and
              the global African diaspora — wherever African legal issues are debated and decided.
            </p>
            <p>
              In addition to the 5,000 copies of the magazine distributed in Nigeria, UK, Canada,
              and US, we are the only provider in our sector with over 50,000 online audience.
            </p>
          </div>
        </section>
      </Reveal>

      {/* What We Do */}
      <Reveal delay={0.12}>
        <section className="mb-20">
          <h2 className="font-utility text-[11px] uppercase tracking-[0.2em] text-digest-red">
            What We Do
          </h2>
          <div className="mt-6 grid gap-6 sm:grid-cols-2 md:grid-cols-3">
            {[
              {
                title: "Publishing",
                desc: "We are a publishing company committed to advancement of sustainable development by sharing executive-level knowledge with middle and top level professionals.",
              },
              {
                title: "Conferences",
                desc: "We are conference organizers, with all events streamed live to our online audience, advocating best practices and promoting networking between policy makers and business leaders.",
              },
              {
                title: "Advocacy",
                desc: "We advocate for best practices in legal journalism and promote networking between policy makers, business leaders, and legal practitioners across Africa.",
              },
              {
                title: "Distribution",
                desc: "Our journal is circulated in Ghana, UK, US, and Canada, providing an international platform for our advertisers and institutional subscribers.",
              },
              {
                title: "Digital Presence",
                desc: "With over 50,000 online readers, we extend our reach beyond print to engage a global audience interested in African legal affairs.",
              },
              {
                title: "Library Access",
                desc: "Our journal is provided to internationally renowned law libraries including the British Library, Oxford University, and Cornell Law School.",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="border-t-2 border-digest-red/20 pt-4 transition-border-color duration-300 hover:border-digest-red"
              >
                <h3 className="font-display text-lg italic text-ink">{item.title}</h3>
                <p className="mt-2 font-body text-sm leading-relaxed text-stone">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </section>
      </Reveal>

      {/* Editorial Philosophy */}
      <Reveal delay={0.14}>
        <section className="mb-20 max-w-3xl">
          <h2 className="font-utility text-[11px] uppercase tracking-[0.2em] text-digest-red">
            Editorial Philosophy
          </h2>
          <div className="mt-6 space-y-4 font-body text-base leading-relaxed text-stone">
            <p>
              We believe the law is not merely a set of rules — it is the framework through which
              societies organise themselves, resolve disputes, and pursue justice.
            </p>
            <p>
              Law Digest publishes work that is analytically rigorous, practically relevant, and
              written for an audience that includes both specialists and informed non-lawyers.
              Every article is fact-checked, fully referenced, and edited to the highest editorial
              standards.
            </p>
            <p>
              The magazine was launched in London on the 10th January 2013 and has set a precedent
              for featuring international contributors from the major common law jurisdictions
              including the US, Canada, and UK.
            </p>
          </div>
        </section>
      </Reveal>

      {/* Our Reach - Institutional Subscribers */}
      <Reveal delay={0.16}>
        <section className="mb-20 bg-hairline/30 py-12 px-6">
          <h2 className="font-utility text-[11px] uppercase tracking-[0.2em] text-digest-red">
            Our Institutional Subscribers
          </h2>
          <p className="mt-4 max-w-3xl font-body text-base leading-relaxed text-stone">
            Some of our leading institutional subscribers include the Central Bank of Nigeria, NNPC,
            NDIC, AMCON, Nigerian Embassy in UK, Government parastatals, top hotels in Abuja, Lagos,
            and Port Harcourt, airports, leading supermarkets and bookshops, and leading commercial
            law firms.
          </p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 md:grid-cols-3">
            {[
              "Central Bank of Nigeria",
              "NNPC",
              "NDIC",
              "AMCON",
              "Nigerian Embassy, UK",
              "British Library",
              "Oxford University (Bodleian)",
              "University of Manchester",
              "Cornell Law School",
            ].map((subscriber) => (
              <div key={subscriber} className="flex items-center gap-2">
                <span className="block h-1.5 w-1.5 shrink-0 bg-digest-red" />
                <span className="font-admin text-sm text-ink">{subscriber}</span>
              </div>
            ))}
          </div>
        </section>
      </Reveal>

      {/* Conference & Events */}
      <Reveal delay={0.18}>
        <section className="mb-20 max-w-3xl">
          <h2 className="font-utility text-[11px] uppercase tracking-[0.2em] text-digest-red">
            Conferences &amp; Events
          </h2>
          <div className="mt-6 space-y-4 font-body text-base leading-relaxed text-stone">
            <p>
              We are a publishing company and conference organizer. The firm and its leadership
              are committed to advancement of sustainable development by sharing executive-level
              knowledge with middle and top level professionals.
            </p>
            <p>
              Our events promote advocacy of best practices and networking between policy makers,
              business leaders, and all our events are streamed live to our online audience.
            </p>
            <p>
              We believe in creating platforms where legal professionals, business leaders, and
              policymakers can engage meaningfully on issues that shape Africa&apos;s legal and
              business landscape.
            </p>
          </div>
        </section>
      </Reveal>

      {/* International Reach */}
      <Reveal delay={0.2}>
        <section className="mb-20 max-w-3xl">
          <h2 className="font-utility text-[11px] uppercase tracking-[0.2em] text-digest-red">
            International Reach
          </h2>
          <div className="mt-6 space-y-4 font-body text-base leading-relaxed text-stone">
            <p>
              Our journal is circulated in Ghana, UK, US, and Canada and therefore provides an
              international platform for our advertisers.
            </p>
            <p>
              In addition to the 5,000 copies of the magazine distributed in Nigeria, UK, Canada,
              and US, we are the only provider in our sector with over 50,000 online audience.
            </p>
            <p>
              The journal is provided to internationally renowned law libraries such as the British
              Library, Bodleian Oxford University, University of Manchester, Law Society Library,
              and Cornell Law School.
            </p>
          </div>
        </section>
      </Reveal>

      {/* Vision & Values */}
      <Reveal delay={0.22}>
        <section className="mb-20 border-t border-hairline pt-12">
          <div className="grid gap-12 md:grid-cols-2">
            <div>
              <h2 className="font-utility text-[11px] uppercase tracking-[0.2em] text-digest-red">
                Our Vision
              </h2>
              <p className="mt-4 font-body text-base leading-relaxed text-stone">
                To be the definitive legal publication for Africa — the source that practitioners,
                policymakers, and scholars turn to first for authoritative, accessible, and beautifully
                presented legal journalism.
              </p>
            </div>
            <div>
              <h2 className="font-utility text-[11px] uppercase tracking-[0.2em] text-digest-red">
                Our Values
              </h2>
              <ul className="mt-4 space-y-3 font-body text-base text-stone">
                <li className="flex items-start gap-3">
                  <span className="mt-2 block h-1.5 w-1.5 shrink-0 bg-digest-red" />
                  <span><strong className="text-ink">Rigour</strong> — Every article is thoroughly researched, fact-checked, and referenced.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-2 block h-1.5 w-1.5 shrink-0 bg-digest-red" />
                  <span><strong className="text-ink">Accessibility</strong> — Complex legal ideas presented clearly, without sacrificing depth.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-2 block h-1.5 w-1.5 shrink-0 bg-digest-red" />
                  <span><strong className="text-ink">Independence</strong> — Editorial decisions driven by merit, not influence.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-2 block h-1.5 w-1.5 shrink-0 bg-digest-red" />
                  <span><strong className="text-ink">Quality</strong> — Premium production standards in every aspect of the publication.</span>
                </li>
              </ul>
            </div>
          </div>
        </section>
      </Reveal>

      {/* Leadership */}
      <Reveal delay={0.24}>
        <section className="mb-20 border-t border-hairline pt-12">
          <h2 className="font-utility text-[11px] uppercase tracking-[0.2em] text-digest-red">
            Leadership
          </h2>
          <div className="mt-6 grid gap-8 sm:grid-cols-2">
            <div className="border-l-2 border-digest-red pl-6">
              <p className="font-display text-xl italic text-ink">
                {masthead.editorInChief.name}
              </p>
              <p className="mt-1 font-utility text-[11px] uppercase tracking-wide text-stone">
                Editor-in-Chief
              </p>
            </div>
            <div className="border-l-2 border-digest-red pl-6">
              <p className="font-display text-xl italic text-ink">
                {masthead.editorNigeria.name}
              </p>
              <p className="mt-1 font-utility text-[11px] uppercase tracking-wide text-stone">
                Editor, Nigeria Issue
              </p>
            </div>
          </div>
          <div className="mt-8 grid gap-8 sm:grid-cols-2">
            <div className="border-l-2 border-hairline pl-6">
              <p className="font-admin text-sm text-ink">{masthead.businessDevelopment.name}</p>
              <p className="mt-1 font-utility text-[11px] uppercase tracking-wide text-stone">
                Business Development
              </p>
            </div>
            <div className="border-l-2 border-hairline pl-6">
              <p className="font-admin text-sm text-ink">{masthead.subscriptionsContact.name}</p>
              <p className="mt-1 font-utility text-[11px] uppercase tracking-wide text-stone">
                Subscriptions &amp; Distribution
              </p>
            </div>
          </div>
        </section>
      </Reveal>

      {/* Owner */}
      <Reveal delay={0.26}>
        <section className="mb-20 border-t border-hairline pt-12">
          <div className="max-w-3xl">
            <h2 className="font-utility text-[11px] uppercase tracking-[0.2em] text-digest-red">
              Founded by
            </h2>
            <p className="mt-4 font-display text-2xl italic text-ink">
              Mr. Tayo Adeyemi
            </p>
            <p className="mt-3 font-body text-base leading-relaxed text-stone">
              Law Digest was founded by Mr. Tayo Adeyemi with the vision of creating a publication
              that would set a new standard for legal journalism in Africa — combining rigorous
              analysis with premium editorial design and production quality.
            </p>
          </div>
        </section>
      </Reveal>

      {/* Editorial Board */}
      {editorialBoard.length > 0 ? (
        <Reveal delay={0.28}>
          <section className="mb-20">
            <h2 className="font-utility text-[11px] uppercase tracking-[0.2em] text-digest-red">
              Editorial Board
            </h2>
            <div className="mt-6 grid gap-6 sm:grid-cols-2">
              {editorialBoard.map((member) => (
                <div
                  key={member.name}
                  className="border-t border-hairline pt-4 transition-colors duration-300 hover:border-digest-red"
                >
                  <p className="font-admin text-sm font-medium text-ink">
                    {member.name}
                    {member.credentials ? `, ${member.credentials}` : ""}
                  </p>
                  <p className="mt-1 font-body text-sm text-stone">{member.role}</p>
                </div>
              ))}
            </div>
          </section>
        </Reveal>
      ) : null}

      {/* Engage */}
      <Reveal delay={0.3}>
        <section className="border-t border-hairline bg-hairline/30 py-12">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="font-display text-2xl italic text-ink">
              Engage with Law Digest
            </h2>
            <p className="mt-4 font-body text-base leading-relaxed text-stone">
              Whether you&apos;re a practitioner looking to contribute, an institution seeking
              partnership, or a reader wanting to subscribe — we&apos;d like to hear from you.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-6">
              <a
                href="mailto:webmaster@nglawdigestblog.com"
                className="border-b-2 border-digest-red font-admin text-sm uppercase tracking-wide text-digest-red transition-opacity hover:opacity-70"
              >
                Contact Us
              </a>
              <a
                href="https://www.nglawdigestblog.com/webmail"
                target="_blank"
                rel="noopener noreferrer"
                className="border-b-2 border-hairline font-admin text-sm uppercase tracking-wide text-stone transition-colors hover:border-digest-red hover:text-digest-red"
              >
                Webmail
              </a>
            </div>
          </div>
        </section>
      </Reveal>
    </div>
  );
}
