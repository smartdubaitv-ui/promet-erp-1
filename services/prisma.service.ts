import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient();

export async function checkPrismaConnection(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (e) {
    return false;
  }
}
