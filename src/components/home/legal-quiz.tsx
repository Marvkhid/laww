"use client";

import { useState } from "react";
import Link from "next/link";
import { Reveal } from "@/components/motion/reveal";
import type { LegalInsight } from "@/lib/types";

export function LegalQuiz({ questions }: { questions: LegalInsight[] }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [isCorrect, setIsCorrect] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);

  if (questions.length === 0) return null;

  const current = questions[currentIndex];
  const options: string[] =
    current.answerOptions && current.answerOptions.length > 0
      ? current.answerOptions
      : [current.content];

  function choose(optionIndex: number) {
    if (selected !== null) return; // already answered this question

    const correct = current.correctOption === optionIndex;
    setSelected(optionIndex);
    setIsCorrect(correct);

    if (correct) {
      setScore((s) => s + 1);
      // Correct answer → automatically advance after a short beat.
      setTimeout(() => {
        setSelected(null);
        setIsCorrect(false);
        if (currentIndex + 1 >= questions.length) {
          setFinished(true);
        } else {
          setCurrentIndex((i) => i + 1);
        }
      }, 900);
    } else {
      setGameOver(true);
    }
  }

  function restart() {
    setCurrentIndex(0);
    setSelected(null);
    setIsCorrect(false);
    setGameOver(false);
    setScore(0);
    setFinished(false);
  }

  return (
    <section className="border-t border-hairline bg-hairline/30">
      <div className="mx-auto max-w-3xl px-6 py-20">
        <Reveal>
          <div className="border-t-2 border-digest-red/20 pt-6">
            <p className="font-utility text-[11px] font-semibold uppercase tracking-[0.2em] text-digest-red">
              § Legal Questions of the Day
            </p>
            <h3 className="mt-3 font-display text-2xl italic text-ink">
              Test your legal knowledge
            </h3>

            {finished ? (
              <div className="mt-8 border border-hairline bg-paper-warm p-6 text-center">
                <p className="font-display text-2xl italic text-ink">Well done! 🎉</p>
                <p className="mt-2 font-body text-stone">
                  You answered all {questions.length} question
                  {questions.length === 1 ? "" : "s"} correctly
                  {score > 1 ? ` — ${score} in a row.` : "."}
                </p>
                <div className="mt-5 flex flex-wrap items-center justify-center gap-4">
                  <button
                    type="button"
                    onClick={restart}
                    className="bg-digest-red px-5 py-2.5 text-sm font-semibold uppercase tracking-wide text-paper transition-colors hover:bg-digest-red-deep"
                  >
                    Play again
                  </button>
                  <Link
                    href="/articles"
                    className="border-b border-digest-red pb-0.5 font-utility text-[11px] font-semibold uppercase tracking-wide text-digest-red transition-opacity hover:opacity-70"
                  >
                    Keep reading →
                  </Link>
                </div>
              </div>
            ) : (
              <>
                {/* Progress */}
                <p className="mt-4 font-utility text-[11px] font-semibold uppercase tracking-wide text-stone">
                  Question {currentIndex + 1} of {questions.length} · Score {score}
                </p>

                {/* Question */}
                <div className="mt-4 min-h-[80px]">
                  <h4 className="font-display text-xl font-bold italic leading-snug text-ink">
                    {current.title}
                  </h4>
                  {current.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={current.imageUrl}
                      alt={current.title}
                      className="mt-4 h-auto w-full object-contain"
                    />
                  ) : null}
                </div>

                {/* Options */}
                <div className="mt-6 flex flex-col gap-3">
                  {options.map((option, i) => {
                    const isChosen = selected === i;
                    const isRightOne = current.correctOption === i;

                    let optionStyles =
                      "border border-hairline bg-paper-warm text-ink hover:border-digest-red hover:bg-white";
                    if (selected !== null && isChosen && isCorrect) {
                      optionStyles = "border-green-700 bg-green-700/10 text-green-900";
                    } else if (isChosen && !isCorrect) {
                      optionStyles = "border-digest-red bg-digest-red/10 text-digest-red";
                    } else if (selected !== null && isRightOne) {
                      optionStyles = "border-green-700 bg-green-700/10 text-green-900";
                    }

                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={() => choose(i)}
                        disabled={selected !== null}
                        className={`flex items-start gap-3 px-4 py-3 text-left font-body text-sm transition-colors disabled:cursor-default ${optionStyles}`}
                      >
                        <span className="font-utility text-xs font-bold uppercase text-digest-red">
                          {String.fromCharCode(65 + i)}.
                        </span>
                        <span className="font-medium text-ink">{option}</span>
                      </button>
                    );
                  })}
                </div>

                {selected !== null && !isCorrect ? (
                  <p className="mt-3 font-body text-sm font-semibold text-digest-red">
                    Not quite — see below.
                  </p>
                ) : null}
              </>
            )}
          </div>
        </Reveal>
      </div>

      {/* ── Game Over popup ─────────────────────────────────────── */}
      {gameOver ? (
        <div
          className="fixed inset-0 z-[150] flex items-center justify-center bg-ink/60 p-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="quiz-game-over"
        >
          <div className="w-full max-w-md border border-hairline bg-paper p-8 text-center shadow-2xl">
            <p className="font-utility text-[11px] font-semibold uppercase tracking-[0.2em] text-digest-red">
              Game Over
            </p>
            <h4 id="quiz-game-over" className="mt-3 font-display text-2xl italic text-ink">
              Almost there!
            </h4>
            <p className="mt-3 font-body text-sm leading-relaxed text-stone">
              {current.correctOption !== null && options[current.correctOption] ? (
                <>
                  The correct answer was{" "}
                  <strong className="text-ink">
                    &ldquo;{options[current.correctOption]}&rdquo;
                  </strong>
                  .{" "}
                </>
              ) : null}
              Don&rsquo;t stop here — keep reading LawDigest articles and you&rsquo;ll ace
              the next round.
            </p>
            <p className="mt-2 font-utility text-[11px] font-semibold uppercase tracking-wide text-stone">
              Score: {score}
            </p>
            <div className="mt-6 flex flex-col gap-3">
              <Link
                href="/articles"
                className="bg-digest-red px-5 py-3 text-sm font-semibold uppercase tracking-wide text-paper transition-colors hover:bg-digest-red-deep"
              >
                Continue reading articles →
              </Link>
              <button
                type="button"
                onClick={restart}
                className="border border-hairline px-5 py-3 text-sm font-semibold uppercase tracking-wide text-ink transition-colors hover:border-digest-red hover:text-digest-red"
              >
                Try again
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
