-- ═══════════════════════════════════════════════════════════════════════════
-- 0023 — Legal Insights → Legal Questions of the Day (interactive quiz)
-- Adds answer options + correct-answer index. Backfills: rows without
-- options become single-option questions where the existing content is the
-- only choice (never auto-marked correct).
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.legal_insights
  add column if not exists answer_options jsonb not null default '[]'::jsonb;
alter table public.legal_insights
  add column if not exists correct_option int;
alter table public.legal_insights
  add constraint legal_insights_correct_option_check
    check (correct_option is null or correct_option >= 0);

-- Backfill: existing rows get their content as the single option.
update public.legal_insights
  set answer_options = jsonb_build_array(content)
  where answer_options = '[]'::jsonb;
