-- Prisma's own migration-history table lives in the public schema too, so
-- Supabase's linter flags it the same way as the app tables. It's owned by
-- `postgres` (the role Prisma connects as), so this is a no-op for `prisma
-- migrate` itself and only closes the anon/authenticated PostgREST path.
ALTER TABLE "_prisma_migrations" ENABLE ROW LEVEL SECURITY;
