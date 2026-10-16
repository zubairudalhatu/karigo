import { Body, Controller, Inject, Injectable, NotFoundException, Param, ParseUUIDPipe, Post, Put, Req, UnauthorizedException, UseGuards } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { Prisma } from "@prisma/client";
import { IsString, IsUUID, Matches, ValidateIf } from "class-validator";
import { PrismaService } from "../../prisma/prisma.service";
import { GovernanceAuthGuard, GovernanceAuthService } from "./governance-auth";
import { governanceAudit } from "./governance-audit";
import { AUTHORITY_CLASSES, AuthorityClass, AuthorityRoster, parseAuthorityRoster, PrismaReleaseActorRepository, ReleaseAudit, ReleaseEvent, ReleaseTarget, RestoreReleaseSession } from "../account-deletion/restore-release";

export const RESTORE_RELEASE_AUDIT = Symbol("RESTORE_RELEASE_AUDIT");
type Store = { payload: any; revision: number };
type HttpRequest = { headers: { authorization?: string } };
const bearer = (r: HttpRequest) => { const m=/^Bearer ([^ ]+)$/.exec(r.headers.authorization??""); if(!m)throw new UnauthorizedException(); return m[1]; };
const refPattern = /^[A-Za-z0-9._:/-]{1,128}$/;
export class GovernanceChangeDto { @IsString() @Matches(refPattern) reference!: string; }
export class AuthorityChangeDto extends GovernanceChangeDto { @ValidateIf((_object,value)=>value!==null) @IsUUID() subject!: string | null; }
export class RestoreCreateDto { @IsUUID() id!: string; }
export const ACTIONS = ["replay-complete","replay-verified","technical-approval","legal-approval","executive-approval","release"] as const;
type Action = typeof ACTIONS[number];
const designated: Record<Action, AuthorityClass> = {"replay-complete":"REPLAY_OPERATOR","replay-verified":"TECHNICAL_VERIFIER","technical-approval":"TECHNICAL_VERIFIER","legal-approval":"LEGAL_COMPLIANCE","executive-approval":"EXECUTIVE",release:"EXECUTIVE"};
type Pending = { action: Action; event: ReleaseEvent; reference: string; credentialVersion: number };
type Session = { target: ReleaseTarget; rosterRevision: number; events: ReleaseEvent[]; pending?: Pending };

@Injectable()
export class GovernanceControlsService {
  constructor(private readonly db: PrismaService, private readonly jwt: JwtService, private readonly config: ConfigService,
    private readonly auth: GovernanceAuthService, @Inject(RESTORE_RELEASE_AUDIT) private readonly independent: ReleaseAudit) {}
  private enabled() { if(this.config.get("GOVERNANCE_EMAIL_AUTH_ENABLED")!=="true")throw new NotFoundException(); }
  private async lock(tx: Prisma.TransactionClient) { await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext('governance-control-state'))::text`; }
  private async read(tx: Prisma.TransactionClient,key:string):Promise<Store|undefined> {
    return (await tx.$queryRaw<Store[]>`SELECT payload, revision FROM governance_control_state WHERE key=${key}`)[0];
  }
  private async save(tx:Prisma.TransactionClient,key:string,payload:unknown) {
    await tx.$executeRaw`INSERT INTO governance_control_state(key,payload) VALUES (${key},${JSON.stringify(payload)}::jsonb)
      ON CONFLICT(key) DO UPDATE SET payload=EXCLUDED.payload,revision=governance_control_state.revision+1`;
  }
  private async administrator(tx:Prisma.TransactionClient,token:string) {
    this.enabled();
    if(this.config.get("GOVERNANCE_ADMIN_PROVISIONING_ENABLED")!=="true")throw new NotFoundException();
    let c:{sub?:string;scope?:string;exp?:number};
    try { c=await this.jwt.verifyAsync(token); } catch { throw new UnauthorizedException(); }
    if(!c.sub || c.scope || !c.exp || c.exp*1000<=Date.now())throw new UnauthorizedException();
    const actor=await tx.user.findFirst({where:{id:c.sub,role:"ADMIN",adminRole:"SUPER_ADMIN",accountStatus:"ACTIVE",deletedAt:null}});
    if(!actor)throw new UnauthorizedException(); return actor.id;
  }
  async changeAuthority(token:string,authority:AuthorityClass,input:AuthorityChangeDto) {
    if(!AUTHORITY_CLASSES.includes(authority) || input.subject===undefined || !refPattern.test(input.reference))throw new UnauthorizedException();
    return this.db.$transaction(async tx=>{
      await this.lock(tx); const actor=await this.administrator(tx,token);
      const current=await this.read(tx,"roster"); const mapping=current?.payload??{};
      const oldSubject=mapping[authority]??null; const subject=input.subject?.toLowerCase()??null;
      if(subject) {
        if(!/^[a-f0-9-]{36}$/.test(subject) || Object.entries(mapping).some(([k,v])=>k!==authority&&v===subject))throw new UnauthorizedException("RESTORE_AUTHORITIES_MUST_BE_DISTINCT");
        const u=await tx.user.findUnique({where:{id:subject},include:{adminEmailIdentity:true,customerProfile:true,vendor:true,rider:true}});
        if(!u || u.role!=="ADMIN" || u.adminRole!=="RESTORE_GOVERNANCE" || u.accountStatus!=="ACTIVE" || u.deletedAt || u.phoneNumber!==null || !u.emailVerified || !u.onboardingPasswordSetAt || !u.passwordHash || !u.adminEmailIdentity || u.adminEmailIdentity.emailKey!==u.email?.toLowerCase() || u.customerProfile || u.vendor || u.rider)throw new UnauthorizedException();
      }
      if(oldSubject===subject)return {changed:false};
      await governanceAudit(tx,"GOVERNANCE_AUTHORITY_CHANGED",actor,subject??oldSubject,{authority,oldSubject,newSubject:subject,reference:input.reference});
      await this.save(tx,"roster",{...mapping,[authority]:subject});return {changed:true};
    });
  }
  async disable(token:string,subject:string,input:GovernanceChangeDto) {
    if(!refPattern.test(input.reference))throw new UnauthorizedException();
    return this.db.$transaction(async tx=>{
      await this.lock(tx);const actor=await this.administrator(tx,token);
      const target=await tx.user.findFirst({where:{id:subject,role:"ADMIN",adminRole:"RESTORE_GOVERNANCE",phoneNumber:null,deletedAt:null},include:{adminEmailIdentity:true}});
      if(!target?.adminEmailIdentity)throw new UnauthorizedException();
      if(target.accountStatus==="DEACTIVATED")return {disabled:true};
      await tx.user.update({where:{id:subject},data:{accountStatus:"DEACTIVATED"}});
      await tx.adminEmailIdentity.update({where:{userId:subject},data:{credentialVersion:{increment:1}}});
      await tx.adminEmailChallenge.updateMany({where:{userId:subject,consumedAt:null},data:{consumedAt:new Date()}});
      await tx.refreshToken.deleteMany({where:{userId:subject}});
      await governanceAudit(tx,"GOVERNANCE_ACCOUNT_DISABLED",actor,subject,{reference:input.reference});
      const roster=await this.read(tx,"roster");if(roster)await this.save(tx,"roster",roster.payload); // invalidate all unfinished sessions
      return {disabled:true};
    });
  }
  private async roster(tx:Prisma.TransactionClient) {
    const row=await this.read(tx,"roster");
    const mapping=row?.payload??{};
    return {revision:row?.revision??-1,mapping:parseAuthorityRoster(JSON.stringify(Object.fromEntries(AUTHORITY_CLASSES.map(k=>[k,mapping[k]?[mapping[k]]:[]]))))};
  }
  private target():ReleaseTarget {
    // These bind the control plane to one reviewed restore, never caller-controlled DB/manifest claims.
    const keys=["RESTORE_INSTANCE_ID","RESTORE_DATABASE_IDENTITY_HASH","RESTORE_MANIFEST_DIGEST","RESTORE_REQUIRED_COVERAGE"];
    const v=keys.map(k=>this.config.get<string>(k));
    if(v.some(x=>!x) || !/^[a-f0-9]{64}$/.test(v[1]!) || !/^[a-f0-9]{64}$/.test(v[2]!))throw new UnauthorizedException("RESTORE_TARGET_NOT_CONFIGURED");
    return {instanceId:v[0]!,databaseIdentityHash:v[1]!,manifestDigest:v[2]!,coverage:v[3]!};
  }
  async create(token:string,id:string) {
    this.enabled(); const user=await this.auth.authenticate(token);
    const claims=await this.jwt.verifyAsync<{cv:number}>(token);
    return this.db.$transaction(async tx=>{
      await this.lock(tx);const roster=await this.roster(tx);
      if(!roster.mapping.REPLAY_OPERATOR.includes(user.id) || !await new PrismaReleaseActorRepository(tx as unknown as PrismaService).activeAdmin(user.id,claims.cv))throw new UnauthorizedException();
      const key=`restore:${id}`,target=this.target(),existing=await this.read(tx,key);
      if(existing) {
        if(Object.entries(target).some(([k,v])=>existing.payload.target[k]!==v) || existing.payload.rosterRevision!==roster.revision)throw new UnauthorizedException("RESTORE_SESSION_CONFLICT");
        return {id,stage:existing.payload.events.at(-1)?.to??"RESTORED_QUARANTINED"};
      }
      await this.save(tx,key,{target,rosterRevision:roster.revision,events:[]});
      await governanceAudit(tx,"RESTORE_QUARANTINE_CREATED",user.id,null,{sessionId:id});
      return {id,stage:"RESTORED_QUARANTINED"};
    });
  }
  async approve(token:string,id:string,action:Action,input:GovernanceChangeDto) {
    this.enabled();if(!ACTIONS.includes(action) || !refPattern.test(input.reference))throw new UnauthorizedException();
    const user=await this.auth.authenticate(token);const claims=await this.jwt.verifyAsync<{cv:number}>(token);
    const key=`restore:${id}`;
    const staged=await this.db.$transaction(async tx=>{
      await this.lock(tx);const roster=await this.roster(tx);const row=await this.read(tx,key);const s=row?.payload as Session|undefined;
      if(!s || s.rosterRevision!==roster.revision || !roster.mapping[designated[action]].includes(user.id) || !await new PrismaReleaseActorRepository(tx as unknown as PrismaService).activeAdmin(user.id,claims.cv))throw new UnauthorizedException("RESTORE_AUTHORITY_DENIED");
      // Canonical serialization removes JSONB key ordering differences.
      s.target={instanceId:s.target.instanceId,databaseIdentityHash:s.target.databaseIdentityHash,manifestDigest:s.target.manifestDigest,coverage:s.target.coverage};
      s.events=s.events.map(canonicalEvent);
      if(s.events.length && !this.independent.verify)throw new UnauthorizedException("RESTORE_HISTORY_VERIFIER_REQUIRED");
      for(const e of s.events) {
        const proof=await this.independent.verify!(e); // read-only: never create missing historical approvals
        if(proof.verifiedDigest!==e.digest || !/^\d+$/.test(proof.generation))throw new UnauthorizedException("RESTORE_HISTORY_NOT_VERIFIED");
      }
      const duplicate=s.events.find(e=>e.from===fromStage(action));
      if(duplicate) {
        if(duplicate.subject!==user.id)throw new UnauthorizedException();
        return {duplicate:true,event:duplicate};
      }
      if(s.pending) {
        if(s.pending.action!==action || s.pending.event.subject!==user.id || s.pending.credentialVersion!==claims.cv || s.pending.reference!==input.reference)throw new UnauthorizedException("RESTORE_APPROVAL_PENDING");
        return {duplicate:false,event:canonicalEvent(s.pending.event)};
      }
      let event:ReleaseEvent|undefined;
      const machine=new RestoreReleaseSession(s.target,this.jwt,new PrismaReleaseActorRepository(tx as unknown as PrismaService),()=>roster.mapping,{append:async e=>{event=e;return {generation:"1",verifiedDigest:e.digest};}});
      machine.loadVerifiedHistory(s.events);
      const method=({"replay-complete":"replayComplete","replay-verified":"replayVerified","technical-approval":"technicalApproval","legal-approval":"legalApproval","executive-approval":"executiveApproval",release:"release"} as const)[action];
      await machine[method](token);
      s.pending={action,event:event!,reference:input.reference,credentialVersion:claims.cv};
      await this.save(tx,key,s);return {duplicate:false,event:event!};
    },{timeout:60000});
    if(staged.duplicate)return {id,stage:staged.event.to,duplicate:true};
    // Frozen event is committed before external I/O: an ambiguous outcome retries only the exact same object.
    const evidence=await this.independent.append(staged.event);
    if(!/^\d+$/.test(evidence.generation) || evidence.verifiedDigest!==staged.event.digest)throw new UnauthorizedException("RESTORE_AUDIT_NOT_VERIFIED");
    return this.db.$transaction(async tx=>{
      await this.lock(tx);const current=await this.jwt.verifyAsync<{cv:number}>(token);
      if(!await new PrismaReleaseActorRepository(tx as unknown as PrismaService).activeAdmin(user.id,current.cv))throw new UnauthorizedException();
      const roster=await this.roster(tx);
      const row=await this.read(tx,key);const s=row?.payload as Session;
      if(!s || s.rosterRevision!==roster.revision)throw new UnauthorizedException("RESTORE_ROSTER_CHANGED");
      if(s.events.some(e=>e.digest===staged.event.digest))return {id,stage:staged.event.to,duplicate:true};
      if(s.pending?.event.digest!==staged.event.digest)throw new UnauthorizedException("RESTORE_APPROVAL_CONFLICT");
      await governanceAudit(tx,"RESTORE_APPROVAL_COMMITTED",user.id,null,{sessionId:id,authority:designated[action],stage:staged.event.to,reference:input.reference,generation:evidence.generation,digest:staged.event.digest});
      s.events.push(staged.event);delete s.pending;await this.save(tx,key,s);
      return {id,stage:staged.event.to,duplicate:false};
    });
  }
}
function fromStage(action:Action) { return ["RESTORED_QUARANTINED","JOURNAL_REPLAY_COMPLETE","REPLAY_VERIFIED","TECHNICAL_VERIFICATION_APPROVED","LEGAL_COMPLIANCE_APPROVED","EXECUTIVE_RELEASE_APPROVED"][ACTIONS.indexOf(action)]; }
function canonicalEvent(e:ReleaseEvent):ReleaseEvent {
  const t=e.target;return {target:{instanceId:t.instanceId,databaseIdentityHash:t.databaseIdentityHash,manifestDigest:t.manifestDigest,coverage:t.coverage},from:e.from,to:e.to,subject:e.subject,authority:e.authority,at:e.at,previousDigest:e.previousDigest,digest:e.digest};
}

@Controller("admin/restore-governance")
export class GovernanceAdministrationController {
  constructor(private readonly control:GovernanceControlsService) {}
  @Put("authorities/:authority") change(@Req() r:HttpRequest,@Param("authority") authority:AuthorityClass,@Body() body:AuthorityChangeDto) {return this.control.changeAuthority(bearer(r),authority,body);}
  @Post("accounts/:id/disable") disable(@Req() r:HttpRequest,@Param("id",new ParseUUIDPipe()) id:string,@Body() body:GovernanceChangeDto) {return this.control.disable(bearer(r),id,body);}
}
@Controller("restore-governance")
@UseGuards(GovernanceAuthGuard)
export class RestoreGovernanceController {
  constructor(private readonly control:GovernanceControlsService) {}
  @Post("sessions") create(@Req() r:HttpRequest,@Body() body:RestoreCreateDto) {return this.control.create(bearer(r),body.id);}
  @Post("sessions/:id/:action") approve(@Req() r:HttpRequest,@Param("id",new ParseUUIDPipe()) id:string,@Param("action") action:Action,@Body() body:GovernanceChangeDto) {return this.control.approve(bearer(r),id,action,body);}
}
