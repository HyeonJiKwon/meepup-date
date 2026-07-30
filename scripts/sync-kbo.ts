import "dotenv/config";
import { prisma } from "@/lib/prisma";
import { fetchSeasonGames } from "@/lib/kbo";
import { parseDateKeyUTC } from "@/lib/date";

async function main() {
  const year = new Date().getFullYear();
  const games = await fetchSeasonGames(year);

  if (games.length === 0) {
    console.error("No games fetched — aborting without touching the table.");
    process.exit(1);
  }

  await prisma.kboGame.deleteMany({
    where: {
      date: {
        gte: parseDateKeyUTC(`${year}-01-01`),
        lte: parseDateKeyUTC(`${year}-12-31`),
      },
    },
  });

  await prisma.kboGame.createMany({
    data: games.map((g) => ({
      date: parseDateKeyUTC(g.date),
      homeTeam: g.homeTeam,
      awayTeam: g.awayTeam,
      stadium: g.stadium,
    })),
  });

  console.log(`Synced ${games.length} games for ${year} season.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
