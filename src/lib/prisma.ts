import { PrismaClient } from "@prisma/client";
import { withOptimize } from "@prisma/extension-optimize";
import { withAccelerate } from "@prisma/extension-accelerate";
import { generateUniqueSKU } from "@/utils/skuUtils";
import { isAccelerateEnabled } from "@/lib/prisma-cache";

function createBasePrismaClient() {
  return new PrismaClient({
    // Query logging adds noticeable overhead in dev; enable only when debugging.
    log: process.env.PRISMA_LOG_QUERIES === "true" ? ["query"] : [],
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  });
}

type BasePrismaClient = ReturnType<typeof createBasePrismaClient>;

const globalForPrisma = global as unknown as { prisma: BasePrismaClient | undefined };

function createExtendedPrismaClient(base: BasePrismaClient) {
  const useOptimize =
    process.env.NODE_ENV === "production" &&
    Boolean(process.env.OPTIMIZE_API_KEY?.trim());

  // Prisma Optimize is sunset (HTTP 410) — only attach when explicitly enabled in production.
  let client = base;
  if (useOptimize) {
    client = client.$extends(
      withOptimize({
        apiKey: process.env.OPTIMIZE_API_KEY || "",
      }),
    ) as typeof client;
  }

  if (isAccelerateEnabled) {
    client = client.$extends(withAccelerate()) as typeof client;
  }

  return client.$extends({
    query: {
      product: {
        async create({ args, query }) {
          // If SKU is not provided or is empty, generate one
          if (!args.data.sku || args.data.sku === "") {
            args.data.sku = await generateUniqueSKU();
          }
          return query(args);
        },
        async createMany({ args, query }) {
          const data = Array.isArray(args.data) ? args.data : [args.data];
          for (const item of data) {
            if (!item.sku || item.sku === "") {
              item.sku = await generateUniqueSKU();
            }
          }
          return query(args);
        },
      },
    },
  });
}

const basePrisma = globalForPrisma.prisma ?? createBasePrismaClient();

export const prisma = createExtendedPrismaClient(
  basePrisma,
) as unknown as PrismaClient;

export type ExtendedPrismaClient = typeof prisma;

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = basePrisma;
