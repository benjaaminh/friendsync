/**
 * Shared library utilities for prisma used across server and client code.
 */
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { env } from "prisma/config";

const adapter = new PrismaPg({
  connectionString: env("DATABASE_URL"),
});

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/**
 * Shared Prisma client singleton to avoid creating extra connections in dev hot-reload.
 */
export const prisma = globalForPrisma.prisma ?? new PrismaClient({adapter});

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
