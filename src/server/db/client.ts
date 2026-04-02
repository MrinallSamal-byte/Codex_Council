import { PrismaClient } from "@prisma/client";

declare global {
  var __repocouncil_prisma__: PrismaClient | undefined;
  var __repocouncil_prisma_shutdown_registered__: boolean | undefined;
}

export const prisma =
  global.__repocouncil_prisma__ ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  global.__repocouncil_prisma__ = prisma;
}

if (!global.__repocouncil_prisma_shutdown_registered__) {
  const shutdown = async () => {
    await prisma.$disconnect().catch(() => undefined);
  };

  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);
  process.once("beforeExit", shutdown);
  global.__repocouncil_prisma_shutdown_registered__ = true;
}

export async function pingDatabase() {
  await prisma.$queryRawUnsafe("SELECT 1");
}
