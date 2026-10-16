import { createHash } from "node:crypto";
import type { JournalWriter, JournalReader } from "./journal-contracts";
import { retentionExpiry } from "./retention-policy";
import { PrismaClient } from "@prisma/client";
import { JwtService } from "@nestjs/jwt";

export const AUTHORITY_ROSTER_CONFIG = "RESTORE_RELEASE_AUTHORITY_ROSTER";
export const AUTHORITY_CLASSES = ["REPLAY_OPERATOR", "TECHNICAL_VERIFIER", "LEGAL_COMPLIANCE", "EXECUTIVE"] as const;
export type AuthorityClass = typeof AUTHORITY_CLASSES[number];
export type AuthorityRoster = Record<AuthorityClass, readonly string[]>;
export type ReleaseStage = "RESTORED_QUARANTINED" | "JOURNAL_REPLAY_COMPLETE" | "REPLAY_VERIFIED"
  | "TECHNICAL_VERIFICATION_APPROVED" | "LEGAL_COMPLIANCE_APPROVED" | "EXECUTIVE_RELEASE_APPROVED" | "RELEASED";
export interface ReleaseTarget { instanceId: string; databaseIdentityHash: string; manifestDigest: string; coverage: string }
export interface ReleaseEvent { target: ReleaseTarget; from: ReleaseStage; to: ReleaseStage; subject: string; authority: AuthorityClass;
  at: string; previousDigest: string; digest: string }
// Store must live outside the restored DB. Append verifies create-if-absent, generation and readback;
// no state advancement or listener startup is allowed on a missing/ambiguous acknowledgement.
export interface ReleaseAudit {
  append(event: ReleaseEvent): Promise<{ generation: string; verifiedDigest: string }>;
  verify?(event: ReleaseEvent): Promise<{ generation: string; verifiedDigest: string }>;
}
export interface ReleaseActorRepository { activeAdmin(subject: string, credentialVersion?: number): Promise<boolean> }
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
export function parseAuthorityRoster(value: string | undefined): AuthorityRoster {
  if (!value) throw new Error("RESTORE_AUTHORITY_ROSTER_MISSING");
  const r = JSON.parse(value) as AuthorityRoster;
  if (Object.keys(r).length !== 4 || AUTHORITY_CLASSES.some(k => !Array.isArray(r[k]) || !r[k].length || r[k].some(s => !uuid.test(s))))
    throw new Error("INVALID_RESTORE_AUTHORITY_ROSTER");
  const all = AUTHORITY_CLASSES.flatMap(k => r[k].map(s => s.toLowerCase()));
  if (new Set(all).size !== all.length) throw new Error("RESTORE_AUTHORITIES_MUST_BE_DISTINCT");
  return Object.freeze(Object.fromEntries(AUTHORITY_CLASSES.map(k => [k, Object.freeze(r[k].map(s => s.toLowerCase()))]))) as AuthorityRoster;
}
export class RestoreReleaseSession {
  private state: ReleaseStage = "RESTORED_QUARANTINED";
  private head = "0".repeat(64);
  private replaySubject?: string;
  private readonly usedAuthorities = new Map<string, AuthorityClass>();
  private queue: Promise<unknown> = Promise.resolve();
  constructor(private readonly target: ReleaseTarget, private readonly jwt: JwtService,
    private readonly actors: ReleaseActorRepository, private readonly roster: () => AuthorityRoster,
    private readonly audit: ReleaseAudit) {
    if (!target.instanceId || !target.databaseIdentityHash || !target.manifestDigest || !target.coverage) throw new Error("INVALID_RESTORE_TARGET");
    this.target = Object.freeze({ instanceId: target.instanceId, databaseIdentityHash: target.databaseIdentityHash, manifestDigest: target.manifestDigest, coverage: target.coverage });
  }
  get stage() { return this.state; }
  // Only the controller's immutable, independently read-back history is loaded.
  // Never restore a caller-supplied stage or a bare mutable database snapshot.
  loadVerifiedHistory(events: ReleaseEvent[]) {
    if (this.state !== "RESTORED_QUARANTINED") throw new Error("RESTORE_HISTORY_ALREADY_LOADED");
    const stages: ReleaseStage[] = ["RESTORED_QUARANTINED","JOURNAL_REPLAY_COMPLETE","REPLAY_VERIFIED","TECHNICAL_VERIFICATION_APPROVED","LEGAL_COMPLIANCE_APPROVED","EXECUTIVE_RELEASE_APPROVED","RELEASED"];
    const authorities: AuthorityClass[] = ["REPLAY_OPERATOR","TECHNICAL_VERIFIER","TECHNICAL_VERIFIER","LEGAL_COMPLIANCE","EXECUTIVE","EXECUTIVE"];
    for (const [i,event] of events.entries()) {
      const {digest,...fact}=event;
      if (i>=authorities.length || event.from!==stages[i] || event.to!==stages[i+1] || event.authority!==authorities[i]
        || JSON.stringify(event.target)!==JSON.stringify(this.target) || event.previousDigest!==this.head
        || createHash("sha256").update(JSON.stringify(fact)).digest("hex")!==digest
        || !this.roster()[event.authority]?.includes(event.subject)
        || (this.usedAuthorities.has(event.subject) && this.usedAuthorities.get(event.subject)!==event.authority)) throw new Error("RESTORE_HISTORY_INVALID");
      this.usedAuthorities.set(event.subject,event.authority);
      if(event.authority==="REPLAY_OPERATOR")this.replaySubject=event.subject;
      this.state=event.to; this.head=digest;
    }
  }
  assertOperational() { if (this.state !== "RELEASED") throw new Error("RESTORE_REMAINS_QUARANTINED"); }
  private async authenticate(token: string, authority: AuthorityClass) {
    const claims = await this.jwt.verifyAsync<{ sub?: string; exp?: number; scope?: string; cv?: number }>(token);
    const subject = claims.sub?.toLowerCase();
    if (claims.scope !== "restore-governance" || !Number.isInteger(claims.cv) || !subject || !uuid.test(subject) || !claims.exp || claims.exp * 1000 <= Date.now()
      || !this.roster()[authority]?.includes(subject) || !await this.actors.activeAdmin(subject, claims.cv))
      throw new Error("RESTORE_AUTHORITY_DENIED");
    if (authority !== "REPLAY_OPERATOR" && subject === this.replaySubject) throw new Error("RESTORE_SELF_RELEASE_DENIED");
    if (this.usedAuthorities.has(subject) && this.usedAuthorities.get(subject) !== authority) throw new Error("RESTORE_AUTHORITIES_MUST_BE_DISTINCT");
    return subject;
  }
  private transition(token: string, authority: AuthorityClass, from: ReleaseStage, to: ReleaseStage) {
    const action = this.queue.then(async () => {
      if (this.state !== from) throw new Error("INVALID_RESTORE_APPROVAL_ORDER");
      const subject = await this.authenticate(token, authority);
      const fact = { target: this.target, from, to, subject, authority, at: new Date().toISOString(), previousDigest: this.head };
      const digest = createHash("sha256").update(JSON.stringify(fact)).digest("hex");
      const evidence = await this.audit.append({ ...fact, digest });
      if (!/^\d+$/.test(evidence.generation) || evidence.verifiedDigest !== digest) throw new Error("RESTORE_APPROVAL_AUDIT_NOT_DURABLE");
      if (authority === "REPLAY_OPERATOR") this.replaySubject = subject;
      this.usedAuthorities.set(subject, authority);
      this.head = digest; this.state = to;
    });
    this.queue = action.catch(() => undefined); return action;
  }
  replayComplete(token: string) { return this.transition(token, "REPLAY_OPERATOR", "RESTORED_QUARANTINED", "JOURNAL_REPLAY_COMPLETE"); }
  replayVerified(token: string) { return this.transition(token, "TECHNICAL_VERIFIER", "JOURNAL_REPLAY_COMPLETE", "REPLAY_VERIFIED"); }
  technicalApproval(token: string) { return this.transition(token, "TECHNICAL_VERIFIER", "REPLAY_VERIFIED", "TECHNICAL_VERIFICATION_APPROVED"); }
  legalApproval(token: string) { return this.transition(token, "LEGAL_COMPLIANCE", "TECHNICAL_VERIFICATION_APPROVED", "LEGAL_COMPLIANCE_APPROVED"); }
  executiveApproval(token: string) { return this.transition(token, "EXECUTIVE", "LEGAL_COMPLIANCE_APPROVED", "EXECUTIVE_RELEASE_APPROVED"); }
  release(token: string) { return this.transition(token, "EXECUTIVE", "EXECUTIVE_RELEASE_APPROVED", "RELEASED"); }
}

export class GcsReleaseAudit implements ReleaseAudit {
  constructor(private readonly writer: JournalWriter, private readonly reader: JournalReader) {}
  async append(event: ReleaseEvent) {
    const body = JSON.stringify({ kind: "RESTORE_APPROVAL", ...event });
    const name = `checkpoints/v1/release-${event.digest}.json`;
    const until = retentionExpiry("DELETION_AUDIT", new Date(event.at)).toISOString();
    const write = await this.writer.create(name, body, until);
    if (write.status !== 200 && write.status !== 412) throw new Error("RESTORE_APPROVAL_NOT_PUBLISHED");
    const read = await this.reader.read(name, write.generation);
    if (read.body !== body || read.retentionMode !== "Unlocked" || read.retainUntil !== until) throw new Error("RESTORE_APPROVAL_NOT_VERIFIED");
    return { generation: read.generation, verifiedDigest: event.digest };
  }
  async verify(event: ReleaseEvent) {
    const body=JSON.stringify({kind:"RESTORE_APPROVAL",...event});
    const read=await this.reader.read(`checkpoints/v1/release-${event.digest}.json`);
    const until=retentionExpiry("DELETION_AUDIT",new Date(event.at)).toISOString();
    if(read.body!==body || !/^\d+$/.test(read.generation) || read.retentionMode!=="Unlocked" || read.retainUntil!==until)throw new Error("RESTORE_HISTORY_NOT_VERIFIED");
    return {generation:read.generation,verifiedDigest:event.digest};
  }
}

// Authentication identifies an existing KariGO administrator; roster membership grants only
// the separately approved restoration authority, never general IAM or account permissions.
export class PrismaReleaseActorRepository implements ReleaseActorRepository {
  constructor(private readonly db: PrismaClient) {}
  async activeAdmin(subject: string, credentialVersion?: number) {
    if (!Number.isInteger(credentialVersion)) return false;
    const u = await this.db.user.findFirst({ where: { id: subject, role: "ADMIN", adminRole: "RESTORE_GOVERNANCE", accountStatus: "ACTIVE", emailVerified: true, phoneNumber: null, deletedAt: null,
      customerProfile: null, vendor: null, rider: null, adminEmailIdentity: { credentialVersion } }, select: { email:true, adminEmailIdentity: {select:{emailKey:true}} } });
    return !!u?.email && u.adminEmailIdentity?.emailKey === u.email.toLowerCase();
  }
}
export function authorityRosterFromEnvironment() {
  return parseAuthorityRoster(process.env[AUTHORITY_ROSTER_CONFIG]);
}
