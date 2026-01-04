import { PrismaClient } from "@prisma/client";
import { withOptimize } from "@prisma/extension-optimize";
import { withAccelerate } from "@prisma/extension-accelerate";
import { generateUniqueSKU } from "@/utils/skuUtils";

const globalForPrisma = global as unknown as { prisma: PrismaClient };

// Create base Prisma client with connection pooling optimization
const basePrisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query"] : [],
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  });

// Extend Prisma Client with Optimize and Accelerate extensions, and custom SKU generation
export const prisma = basePrisma
  .$extends(
    withOptimize({ 
      apiKey: process.env.OPTIMIZE_API_KEY || '' 
    })
  )
  .$extends(
    withAccelerate()
  )
  .$extends({
    query: {
      product: {
        async create({ args, query }) {
          // If SKU is not provided or is empty, generate one
          if (!args.data.sku || args.data.sku === '') {
            args.data.sku = await generateUniqueSKU();
          }
          return query(args);
        },
        async createMany({ args, query }) {
          const data = Array.isArray(args.data) ? args.data : [args.data];
          for (const item of data) {
            if (!item.sku || item.sku === '') {
              item.sku = await generateUniqueSKU();
            }
          }
          return query(args);
        },
      },
    },
  }) as unknown as PrismaClient;

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = basePrisma;