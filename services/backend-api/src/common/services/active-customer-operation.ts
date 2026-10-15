import { UnauthorizedException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";

// Same per-user lock as account erasure: a request which was authenticated
// before deletion cannot recreate identity/tokens after deletion commits.
export async function activeUserOperation<T>(prisma: PrismaService, userId: string,
  operation: (tx: Prisma.TransactionClient) => Promise<T>, customerScope = false) {
  return prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${userId}))::text AS lock`;
    const user = await tx.user.findUnique({ where: { id: userId }, select: { deletedAt: true, accountStatus: true, customerAccessDeletedAt: true } });
    if (!user || user.deletedAt || user.accountStatus !== "ACTIVE" || (customerScope && user.customerAccessDeletedAt)) throw new UnauthorizedException("Account access is no longer active.");
    return operation(tx);
  }, { timeout: 60_000 });
}
