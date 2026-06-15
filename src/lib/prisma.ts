import { PrismaClient } from "@/generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  prismaConnectionString?: string;
};

const getConnectionString = () => {
  const connectionString =
    process.env.DIRECT_DATABASE_URL ?? process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL is not set.");
  }

  const url = new URL(connectionString);

  if (
    url.protocol === "prisma+postgres:" &&
    (url.hostname === "localhost" || url.hostname === "127.0.0.1") &&
    url.port
  ) {
    const databasePort = Number(url.port) + 1;

    return `postgres://postgres:postgres@${url.hostname}:${databasePort}/template1?sslmode=disable&connection_limit=10&connect_timeout=0&max_idle_connection_lifetime=0&pool_timeout=0&socket_timeout=0`;
  }

  return connectionString;
};

const connectionString = getConnectionString();

const adapter = new PrismaPg({ connectionString });

export const prisma =
  globalForPrisma.prismaConnectionString === connectionString
    ? (globalForPrisma.prisma ??
        new PrismaClient({
          adapter,
        }))
    : new PrismaClient({
        adapter,
      });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
  globalForPrisma.prismaConnectionString = connectionString;
}