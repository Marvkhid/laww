import { createSupabaseServerClient } from "@/lib/supabase/client";
import { getCurrentCallForPapers } from "@/lib/supabase/queries/call-for-papers";
import { SectionHeading } from "@/components/ui/section-heading";
import { Reveal } from "@/components/motion/reveal";
import { PenAndDocument } from "@/components/ui/editorial-illustration";

export async function CallForPapers() {
  const supabase = createSupabaseServerClient();
  const callForPapers = await getCurrentCallForPapers(supabase);

  if (!callForPapers) return null;

  return (
    <section className="border-t border-hairline bg-hairline/30">
      <div className="mx-auto max-w-6xl px-6 py-20">
        <Reveal>
          <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <SectionHeading
              eyebrow="Call for Papers"
              title={`Write for Issue ${callForPapers.nextIssueNumber}`}
            />
            <PenAndDocument className="h-20 w-20 shrink-0 opacity-25" />
          </div>
          <div className="grid gap-10 md:grid-cols-3">
            <div className="font-admin text-sm text-ink md:col-span-2 max-w-prose">
              <p className="leading-relaxed">
                Law Digest is accepting submissions for Issue {callForPapers.nextIssueNumber}
                , publishing {callForPapers.nextIssueMonth}. Submissions should run to no
                more than {callForPapers.wordLimit.toLocaleString()} words and be fully
                referenced.
              </p>
              <p className="mt-6 font-utility text-[11px] uppercase tracking-[0.15em] text-digest-red">
                Deadline: {callForPapers.deadline}
              </p>
              <p className="mt-4">
                Send submissions to{" "}
                <a
                  href={`mailto:${callForPapers.contactEmail}`}
                  className="border-b border-digest-red font-medium text-digest-red transition-opacity hover:opacity-70"
                >
                  {callForPapers.contactEmail}
                </a>
                .
              </p>
            </div>
            <div>
              <p className="font-utility text-[11px] uppercase tracking-[0.15em] text-stone">
                Topics
              </p>
              <ul className="mt-3 space-y-0">
                {callForPapers.topics.map((topic) => (
                  <li
                    key={topic}
                    className="border-t border-hairline py-3 font-utility text-xs uppercase tracking-wide text-ink first:border-t-0"
                  >
                    {topic}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
