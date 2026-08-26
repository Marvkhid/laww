"use client";

import { useState } from "react";
import { createSupabaseServerClient } from "@/lib/supabase/client";
import { getPublishedLegalInsights } from "@/lib/supabase/queries/legal-insights";
import { Reveal } from "@/components/motion/reveal";
import type { LegalInsight } from "@/lib/types";

// Server-fetched data will be passed as props
export function LegalKnowledge({ insights }: { insights: LegalInsight[] }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);

  if (insights.length === 0) return null;

  const current = insights[currentIndex];

  return (
    <section className="border-t border-hairline bg-hairline/30">
      <div className="mx-auto max-w-6xl px-6 py-20">
        <Reveal>
          <div className="border-t-2 border-digest-red/20 pt-6">
            <p className="font-utility text-[11px] uppercase tracking-[0.2em] text-digest-red">
              § Legal Insight
            </p>
            <h3 className="mt-3 font-display text-2xl italic text-ink">
              {current.title}
            </h3>
            <div className="mt-4 min-h-[120px]">
              {showAnswer ? (
                <div className="rounded-sm border border-hairline bg-paper-warm p-4">
                  {current.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={current.imageUrl}
                      alt={current.title}
                      className="mb-3 w-full h-auto"
                    />
                  ) : null}
                  <p className="font-body text-sm leading-relaxed text-ink">
                    {current.content}
                  </p>
                  {current.description ? (
                    <p className="mt-2 font-utility text-[10px] uppercase tracking-wide text-stone">
                      {current.description}
                    </p>
                  ) : null}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowAnswer(true)}
                  className="mt-4 border-b border-digest-red pb-1 font-utility text-xs uppercase tracking-wide text-digest-red transition-opacity hover:opacity-70"
                >
                  Reveal answer →
                </button>
              )}
            </div>
            <div className="mt-4 flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setCurrentIndex((prev) => (prev + 1) % insights.length);
                  setShowAnswer(false);
                }}
                className="font-utility text-[10px] uppercase tracking-wide text-stone hover:text-digest-red"
              >
                Next insight →
              </button>
              <span className="font-utility text-[10px] text-stone">
                {currentIndex + 1} / {insights.length}
              </span>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
