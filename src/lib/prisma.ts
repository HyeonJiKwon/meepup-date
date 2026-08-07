import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// Each Vercel serverless instance gets its own pool, so the effective total
// against Supabase is this number times however many instances are running
// concurrently, not just requests within one. Supabase's free-tier pooler
// (pgbouncer, port 6543 — what DATABASE_URL points at) caps out at 200
// client connections total for the whole project. At max: 20, as few as 10
// concurrent instances would exhaust that budget and start failing
// connections for every user, not just slow them down. max: 10 leaves
// headroom up to 20 concurrent instances before hitting the ceiling, and
// costs little in practice since a single instance rarely serves more than
// a handful of concurrent requests on this app's traffic pattern.
const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  connectionTimeoutMillis: 10_000,
});

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
