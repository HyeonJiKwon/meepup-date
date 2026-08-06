-- Supabase flagged every public table as publicly accessible via its
-- auto-generated PostgREST API because Row-Level Security was never enabled.
-- This app has no Supabase Auth / anon API usage — all access goes through
-- our own Next.js API routes via Prisma, which connects as the `postgres`
-- role. That role owns every table below, and Postgres always bypasses RLS
-- for the table owner (unless FORCE ROW LEVEL SECURITY is set, which we
-- deliberately don't do here), so this is a no-op for the app itself and
-- only closes off the anon/authenticated PostgREST access path.
ALTER TABLE "Event" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Participant" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "KboGame" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AuthThrottle" ENABLE ROW LEVEL SECURITY;
