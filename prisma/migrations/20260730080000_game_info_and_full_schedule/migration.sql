-- KboGame is just a cache table; it was truncated before this migration, so
-- dropping/adding NOT NULL columns directly is safe (no data to violate them).
DROP INDEX IF EXISTS "KboGame_teamCode_date_key";

ALTER TABLE "KboGame" DROP COLUMN "teamCode";
ALTER TABLE "KboGame" ADD COLUMN "homeTeam" TEXT NOT NULL;
ALTER TABLE "KboGame" ADD COLUMN "awayTeam" TEXT NOT NULL;
ALTER TABLE "KboGame" ADD COLUMN "stadium" TEXT NOT NULL;

CREATE UNIQUE INDEX "KboGame_date_homeTeam_key" ON "KboGame"("date", "homeTeam");

-- Event: per-date opponent/stadium info for team-created events
ALTER TABLE "Event" ADD COLUMN "gameInfo" JSONB;
