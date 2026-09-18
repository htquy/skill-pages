import { PrismaClient } from "@prisma/client";
import { DatabaseUnavailableError } from "@/src/domain/errors";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createPrismaClient(): PrismaClient {
  const client = new PrismaClient();
  if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = client;
  return client;
}

function unavailablePrisma(): PrismaClient {
  const handler: ProxyHandler<PrismaClient> = {
    get(_target, prop) {
      if (typeof prop === "symbol") return undefined;
      throw new DatabaseUnavailableError(
        `Database is not configured. Set DATABASE_URL in your environment and run "npm run db:migrate".`,
      );
    },
  };
  return new Proxy({} as PrismaClient, handler);
}

export const prisma: PrismaClient = process.env.DATABASE_URL
  ? globalForPrisma.prisma ?? createPrismaClient()
  : unavailablePrisma();