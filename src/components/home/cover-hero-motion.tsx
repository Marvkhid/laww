"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { EDITORIAL_EASE } from "@/components/motion/reveal";

export function CoverHeroMotion({
  eyebrow,
  subjectName,
  subjectRole,
  dek,
  slug,
}: {
  eyebrow: string;
  subjectName: string;
  subjectRole: string;
  dek: string;
  slug: string;
}) {
  const reduceMotion = useReducedMotion();
  const hidden = reduceMotion ? {} : { opacity: 0, y: 24 };
  const shown = { opacity: 1, y: 0 };

  return (
    <div className="cover-story-overlay">
      <motion.p
        initial={hidden}
        animate={shown}
        transition={{ duration: 0.5, ease: EDITORIAL_EASE }}
        className="font-utility text-[10px] uppercase tracking-[0.2em] text-digest-red"
      >
        {eyebrow}
      </motion.p>

      <motion.div
        initial={hidden}
        animate={shown}
        transition={{ duration: 0.4, delay: 0.08, ease: EDITORIAL_EASE }}
        className="mt-3 flex items-center gap-3"
      >
        <span className="block h-px w-8 bg-digest-red" />
        <span className="block h-1 w-1 bg-digest-red" />
      </motion.div>

      <motion.h1
        initial={hidden}
        animate={shown}
        transition={{ duration: 0.7, delay: 0.15, ease: EDITORIAL_EASE }}
        className="mt-3 font-display text-2xl italic leading-snug text-ink md:text-3xl lg:text-[2rem]"
      >
        {subjectName}
      </motion.h1>

      <motion.p
        initial={hidden}
        animate={shown}
        transition={{ duration: 0.5, delay: 0.25, ease: EDITORIAL_EASE }}
        className="mt-2 font-body text-xs leading-relaxed text-stone"
      >
        {subjectRole}
      </motion.p>

      {dek ? (
        <motion.div
          initial={hidden}
          animate={shown}
          transition={{ duration: 0.5, delay: 0.3, ease: EDITORIAL_EASE }}
          className="relative mt-4 overflow-hidden"
        >
          <div className="absolute top-0 left-0 h-full w-[2px] bg-digest-red" />
          <p className="bg-digest-red/5 py-3 pl-4 pr-3 font-body text-sm leading-relaxed text-ink">
            {dek}
          </p>
        </motion.div>
      ) : null}

      <motion.div
        initial={hidden}
        animate={shown}
        transition={{ duration: 0.5, delay: 0.4, ease: EDITORIAL_EASE }}
        className="mt-5"
      >
        <Link
          href={slug}
          className="group inline-flex items-center gap-2 border-b border-digest-red pb-0.5 font-utility text-[10px] uppercase tracking-[0.15em] text-digest-red transition-all duration-300 hover:gap-3"
        >
          Read the cover story
          <span className="transition-transform duration-300 group-hover:translate-x-1">
            →
          </span>
        </Link>
      </motion.div>
    </div>
  );
}
