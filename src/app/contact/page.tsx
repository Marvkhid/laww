import type { Metadata } from "next";
import { SectionHeading } from "@/components/ui/section-heading";
import { ContactForm } from "@/components/forms/contact-form";
import { Reveal } from "@/components/motion/reveal";
import { Handshake } from "@/components/ui/editorial-illustration";

export const metadata: Metadata = {
  title: "Contact — Law Digest",
  description: "Get in touch with the Law Digest editorial, advertising, and subscriptions team.",
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-16">
      <Reveal>
        <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
          <SectionHeading eyebrow="Contact" title="Get in touch" />
          <Handshake className="h-24 w-24 shrink-0 opacity-30" />
        </div>
      </Reveal>

      <div className="grid gap-16 lg:grid-cols-[1fr_1.4fr]">
        {/* Left: contact info */}
        <Reveal delay={0.08}>
          <div className="space-y-10">
            <section>
              <h3 className="font-utility text-[11px] uppercase tracking-[0.2em] text-digest-red">
                General Enquiries
              </h3>
              <p className="mt-3 font-body text-sm leading-relaxed text-stone">
                For all general questions about Law Digest, the publication, or
                partnership opportunities.
              </p>
              <a
                href="mailto:webmaster@nglawdigestblog.com"
                className="mt-3 block font-admin text-sm text-digest-red transition-opacity hover:opacity-70"
              >
                webmaster@nglawdigestblog.com
              </a>
              <p className="mt-1 font-admin text-sm text-stone">+234 803 539 3330</p>
              <p className="mt-1 font-admin text-sm text-stone">+44 203 223 0805</p>
            </section>

            <section>
              <h3 className="font-utility text-[11px] uppercase tracking-[0.2em] text-digest-red">
                Editorial
              </h3>
              <p className="mt-3 font-body text-sm leading-relaxed text-stone">
                For article submissions, corrections, editorial queries, and
                contributions to future issues.
              </p>
              <a
                href="mailto:webmaster@nglawdigestblog.com"
                className="mt-3 block font-admin text-sm text-digest-red transition-opacity hover:opacity-70"
              >
                webmaster@nglawdigestblog.com
              </a>
            </section>

            <section>
              <h3 className="font-utility text-[11px] uppercase tracking-[0.2em] text-digest-red">
                Advertising &amp; Partnerships
              </h3>
              <p className="mt-3 font-body text-sm leading-relaxed text-stone">
                For sponsorship, advertising, and collaboration enquiries.
              </p>
              <a
                href="mailto:webmaster@nglawdigestblog.com"
                className="mt-3 block font-admin text-sm text-digest-red transition-opacity hover:opacity-70"
              >
                webmaster@nglawdigestblog.com
              </a>
              <p className="mt-1 font-admin text-sm text-stone">+44 203 223 0805</p>
            </section>

            <section>
              <h3 className="font-utility text-[11px] uppercase tracking-[0.2em] text-digest-red">
                Subscriptions
              </h3>
              <p className="mt-3 font-body text-sm leading-relaxed text-stone">
                To subscribe to Law Digest or manage your subscription, contact
                our subscriptions team.
              </p>
              <a
                href="mailto:webmaster@nglawdigestblog.com"
                className="mt-3 block font-admin text-sm text-digest-red transition-opacity hover:opacity-70"
              >
                webmaster@nglawdigestblog.com
              </a>
              <p className="mt-1 font-admin text-sm text-stone">+44 203 223 0805</p>
            </section>

            <section className="border-t border-hairline pt-8">
              <h3 className="font-utility text-[11px] uppercase tracking-[0.2em] text-digest-red">
                Response Times
              </h3>
              <p className="mt-3 font-body text-sm leading-relaxed text-stone">
                We aim to respond to all enquiries within 2&ndash;3 business days.
                Editorial queries related to current issues are prioritised.
              </p>
            </section>
          </div>
        </Reveal>

        {/* Right: contact form */}
        <Reveal delay={0.15}>
          <div className="border-l border-hairline pl-0 lg:pl-12">
            <h3 className="font-display text-2xl italic text-ink">
              Send us a message
            </h3>
            <p className="mt-3 font-body text-sm leading-relaxed text-stone">
              Fill out the form below and we&apos;ll get back to you as soon as
              possible.
            </p>
            <div className="mt-8">
              <ContactForm />
            </div>
          </div>
        </Reveal>
      </div>
    </div>
  );
}
