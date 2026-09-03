-- Law Digest — Migration 0019
-- Adds a follow_up_sent flag to track whether the 3-day drip email
-- has been delivered. The cron endpoint (src/app/api/cron/newsletter-followup)
-- queries for rows where follow_up_sent = false and created_at is older
-- than 3 days, sends the email, then flips the flag.

alter table public.newsletter_subscribers
  add column follow_up_sent boolean not null default false;
