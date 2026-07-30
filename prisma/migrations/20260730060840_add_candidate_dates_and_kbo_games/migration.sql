-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "candidateDates" DATE[] DEFAULT ARRAY[]::DATE[];

-- CreateTable
CREATE TABLE "KboGame" (
    "id" TEXT NOT NULL,
    "teamCode" TEXT NOT NULL,
    "date" DATE NOT NULL,

    CONSTRAINT "KboGame_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "KboGame_teamCode_date_key" ON "KboGame"("teamCode", "date");
