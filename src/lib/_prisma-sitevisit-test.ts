import { PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const _a: PrismaClient["siteVisit"] = new PrismaClient().siteVisit;
const _b: PrismaClient["siteVisit"] = (prisma as PrismaClient).siteVisit;
