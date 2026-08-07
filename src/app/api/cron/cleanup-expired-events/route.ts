import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const RETENTION_DAYS = 14;

// Vercel Cron hits this daily (see vercel.json). Deletion is naturally
// idempotent — re-running against already-deleted rows is a no-op — which
// is what Vercel recommends for cron jobs, since delivery isn't guaranteed
// exactly-once. Participants cascade-delete with their event, so this is
// the only query needed.
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cutoff = new Date();
  cutoff.setUTCDate(cutoff.getUTCDate() - RETENTION_DAYS);
  cutoff.setUTCHours(0, 0, 0, 0);

  const { count } = await prisma.event.deleteMany({
    where: { endDate: { lt: cutoff } },
  });

  return NextResponse.json({ deleted: count });
}
