import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";

// No email, password, capability token, network address or Authorization header.
// The dedicated table rejects UPDATE/DELETE/TRUNCATE, including cascading deletes.
export async function governanceAudit(tx: Prisma.TransactionClient, event: string,
  actor: string | null, subject: string | null, facts: Record<string, unknown>) {
  await tx.$executeRaw`INSERT INTO governance_security_events
    (id, event, actor, subject, facts) VALUES
    (${randomUUID()}::uuid, ${event}, ${actor}::uuid, ${subject}::uuid, ${JSON.stringify(facts)}::jsonb)`;
}
