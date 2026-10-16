import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { PrismaClient } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { hash } from "bcrypt";
import request from "supertest";
import { PrismaService } from "../../prisma/prisma.service";
import { AUTHORITY_CLASSES, ReleaseEvent } from "../account-deletion/restore-release";
import { GovernanceAuthService, GovernanceAuthController, GovernanceAuthGuard, GovernanceEmailSender, GovernanceLoginValidationAudit, GovernanceRequestLimitGuard } from "./governance-auth";
import { ACTIONS, GovernanceAdministrationController, GovernanceControlsService, RestoreGovernanceController } from "./governance-controls";

const url=process.env.KARIGO_GOVERNANCE_TEST_DATABASE_URL;
if(url){const u=new URL(url);if(u.hostname!=="127.0.0.1"||u.port!=="55439"||!["/karigo_governance_qa_20261015","/karigo_governance_migration_20261016"].includes(u.pathname))throw new Error("Dedicated loopback fixture required");}
const suite=url?describe:describe.skip;
jest.setTimeout(120000);
suite("Governance audit, roster, revocation and authenticated approval HTTP — synthetic only",()=>{
 const db=new PrismaClient({datasourceUrl:url});const jwt=new JwtService({secret:"synthetic-governance-controls-only"});
 const flags:Record<string,string>={GOVERNANCE_EMAIL_AUTH_ENABLED:"true",GOVERNANCE_ADMIN_PROVISIONING_ENABLED:"true",RESTORE_INSTANCE_ID:"synthetic-restore",RESTORE_DATABASE_IDENTITY_HASH:"a".repeat(64),RESTORE_MANIFEST_DIGEST:"b".repeat(64),RESTORE_REQUIRED_COVERAGE:"synthetic"};
 const config={get:(k:string)=>flags[k]} as ConfigService;
 const mail={send:jest.fn()};const auth=new GovernanceAuthService(db as PrismaService,jwt,config,mail as unknown as GovernanceEmailSender);
 const evidence=new Map<string,ReleaseEvent>();let ambiguous=false;
 const independent={append:jest.fn(async(e:ReleaseEvent)=>{evidence.set(e.digest,e);if(ambiguous){ambiguous=false;throw new Error("SYNTHETIC_LOST_ACK");}return {generation:"123",verifiedDigest:e.digest};}),verify:jest.fn(async(e:ReleaseEvent)=>{if(JSON.stringify(evidence.get(e.digest))!==JSON.stringify(e))throw new Error("SYNTHETIC_MISSING_HISTORY");return {generation:"123",verifiedDigest:e.digest};})};
 const control=new GovernanceControlsService(db as PrismaService,jwt,config,auth,independent);
 let app:INestApplication;let admin:string;let adminToken:string;const subjects:string[]=[];let passwordHash:string;
 const password="SyntheticControlsPassword99";
 const token=(i:number)=>jwt.sign({sub:subjects[i],scope:"restore-governance",cv:0},{expiresIn:900});
 const ref={reference:"SYNTHETIC-LOCAL-REVIEW"};
 async function identity() {const id=randomUUID();return db.user.create({data:{id,fullName:"Synthetic governance fixture",email:`${id}@example.invalid`,phoneNumber:null,role:"ADMIN",adminRole:"RESTORE_GOVERNANCE",accountStatus:"ACTIVE",emailVerified:true,onboardingPasswordSetAt:new Date(),passwordHash,adminEmailIdentity:{create:{emailKey:`${id}@example.invalid`}}}});}
 async function events(event:string,subject?:string) {return db.$queryRaw<any[]>`SELECT * FROM governance_security_events WHERE event=${event} AND (${subject??null}::uuid IS NULL OR subject=${subject??null}::uuid) ORDER BY "createdAt" DESC`;}
 async function session() {const id=randomUUID();await control.create(token(0),id);return id;}
 const actorFor=[0,1,1,2,3,3];
 const post=(id:string,i:number,t=token(actorFor[i]))=>request(app.getHttpServer()).post(`/restore-governance/sessions/${id}/${ACTIONS[i]}`).set("Authorization",`Bearer ${t}`).send(ref);
 beforeAll(async()=>{
  passwordHash=await hash(password,4);
  admin=(await db.user.create({data:{fullName:"Synthetic authority administrator",phoneNumber:`fixture:${randomUUID()}`,role:"ADMIN",adminRole:"SUPER_ADMIN",accountStatus:"ACTIVE",passwordHash}})).id;
  adminToken=jwt.sign({sub:admin},{expiresIn:3600});
  for(let i=0;i<4;i++)subjects.push((await identity()).id);
  const module=await Test.createTestingModule({controllers:[GovernanceAdministrationController,RestoreGovernanceController,GovernanceAuthController],providers:[{provide:GovernanceControlsService,useValue:control},{provide:GovernanceAuthService,useValue:auth},{provide:PrismaService,useValue:db},{provide:ConfigService,useValue:config},GovernanceAuthGuard,GovernanceRequestLimitGuard,GovernanceLoginValidationAudit]}).compile();
  app=module.createNestApplication();app.useLogger(false);app.useGlobalPipes(new ValidationPipe({transform:true,whitelist:true}));await app.init();
 });
 beforeEach(async()=>{
  flags.GOVERNANCE_EMAIL_AUTH_ENABLED="true";flags.GOVERNANCE_ADMIN_PROVISIONING_ENABLED="true";
  await db.$executeRaw`DELETE FROM governance_control_state`;
  for(let i=0;i<4;i++)await control.changeAuthority(adminToken,AUTHORITY_CLASSES[i],{...ref,subject:subjects[i]});
  independent.append.mockClear();independent.verify.mockClear();ambiguous=false;
 });
 afterAll(async()=>{await app?.close();await db.$disconnect();});
 it("audits unknown, wrong-password, locked and successful login without email/password/network data",async()=>{
  const email=(await db.user.findUniqueOrThrow({where:{id:subjects[0]}})).email!;
  await expect(auth.login({email:`${randomUUID()}@example.invalid`,password})).rejects.toThrow();
  for(let i=0;i<6;i++)await expect(auth.login({email,password:"WrongSyntheticPassword99"})).rejects.toThrow();
  const failed=await events("GOVERNANCE_LOGIN_FAILED",subjects[0]);expect(failed.length).toBeGreaterThanOrEqual(6);expect(failed[0].facts.reason).toBe("LOCKED");
  await db.adminEmailIdentity.update({where:{userId:subjects[0]},data:{lockedUntil:null,failedLogins:0}});
  await auth.login({email,password});expect((await events("GOVERNANCE_EMAIL_LOGIN",subjects[0])).length).toBeGreaterThan(0);
  expect(JSON.stringify(failed)).not.toContain(email);expect(JSON.stringify(failed)).not.toContain("Password");expect(failed[0].createdAt).toBeInstanceOf(Date);
 });
 it("audits malformed HTTP login without preserving the invalid input",async()=>{
  const before=(await events("GOVERNANCE_LOGIN_FAILED")).length;
  await request(app.getHttpServer()).post("/auth/admin-email/login").send({email:"not-an-email",password:"x"}).expect(400);
  const rows=await events("GOVERNANCE_LOGIN_FAILED");expect(rows.length).toBe(before+1);expect(rows[0].facts).toEqual({reason:"INVALID_INPUT"});
  await request(app.getHttpServer()).post("/AUTH/ADMIN-EMAIL/LOGIN/?synthetic=1").send({email:"not-an-email",password:"x"}).expect(400);
  expect((await events("GOVERNANCE_LOGIN_FAILED")).length).toBe(before+2);
 });
 it("audits rate-limited login attempts while preserving the request limit",async()=>{
  const guard=new GovernanceRequestLimitGuard(db as PrismaService,config);const context={switchToHttp:()=>({getRequest:()=>({ip:"127.0.0.8",originalUrl:"/auth/admin-email/login"})})};
  for(let i=0;i<20;i++)await guard.canActivate(context as never);
  await expect(guard.canActivate(context as never)).rejects.toThrow();expect((await events("GOVERNANCE_LOGIN_FAILED"))[0].facts.reason).toBe("RATE_LIMITED");
 });
 it("records immutable add/change/remove facts and blocks UPDATE, DELETE and TRUNCATE",async()=>{
  const next=await identity();await control.changeAuthority(adminToken,"EXECUTIVE",{...ref,subject:next.id});
  await control.changeAuthority(adminToken,"EXECUTIVE",{...ref,subject:null});
  const rows=await events("GOVERNANCE_AUTHORITY_CHANGED",next.id);expect(rows[0].actor).toBe(admin);expect(rows[0].facts).toEqual({...ref,authority:"EXECUTIVE",oldSubject:next.id,newSubject:null});
  await expect(db.$executeRaw`UPDATE governance_security_events SET event='tampered' WHERE id=${rows[0].id}::uuid`).rejects.toThrow();
  await expect(db.$executeRaw`DELETE FROM governance_security_events WHERE id=${rows[0].id}::uuid`).rejects.toThrow();
  await expect(db.$executeRaw`TRUNCATE governance_security_events`).rejects.toThrow();
 });
 it("rejects reused subjects and governance self-assignment through HTTP",async()=>{
  await expect(control.changeAuthority(adminToken,"EXECUTIVE",{...ref,subject:subjects[0]})).rejects.toThrow();
  const r=await request(app.getHttpServer()).put("/admin/restore-governance/authorities/EXECUTIVE").set("Authorization",`Bearer ${token(3)}`).set("role","SUPER_ADMIN").send({...ref,subject:subjects[3]});expect(r.status).toBe(401);
 });
 it("does not accept free-text subjects or an unauthenticated administrator",async()=>{
  await request(app.getHttpServer()).put("/admin/restore-governance/authorities/EXECUTIVE").send({...ref,subject:subjects[3]}).expect(401);
  await request(app.getHttpServer()).put("/admin/restore-governance/authorities/EXECUTIVE").set("Authorization","Bearer synthetic-invalid").send({...ref,subject:subjects[3]}).expect(401);
  await request(app.getHttpServer()).put("/admin/restore-governance/authorities/EXECUTIVE").set("Authorization",`Bearer ${adminToken}`).send({...ref,subject:"executive@example.invalid"}).expect(400);
  await request(app.getHttpServer()).put("/admin/restore-governance/authorities/EXECUTIVE").set("Authorization",`Bearer ${adminToken}`).send(ref).expect(400);
 });
 it("missing authority mapping blocks session creation",async()=>{
  await control.changeAuthority(adminToken,"LEGAL_COMPLIANCE",{...ref,subject:null});await expect(session()).rejects.toThrow();
 });
 it("audits disablement, revokes prior JWTs/challenges, and rejects login",async()=>{
  const u=await identity();const t=jwt.sign({sub:u.id,scope:"restore-governance",cv:0},{expiresIn:900});
  await auth.authenticate(t);
  await request(app.getHttpServer()).post(`/admin/restore-governance/accounts/${u.id}/disable`).set("Authorization",`Bearer ${adminToken}`).send(ref).expect(201);
  await expect(auth.authenticate(t)).rejects.toThrow();await expect(auth.login({email:u.email!,password})).rejects.toThrow();
  expect((await db.adminEmailIdentity.findUniqueOrThrow({where:{userId:u.id}})).credentialVersion).toBe(1);
  expect((await events("GOVERNANCE_ACCOUNT_DISABLED",u.id))[0].actor).toBe(admin);
 });
 it("cannot disable an unrelated Customer or mutate that account",async()=>{
  const u=await db.user.create({data:{fullName:"Synthetic Customer",phoneNumber:`fixture:${randomUUID()}`,role:"CUSTOMER",passwordHash}});
  await expect(control.disable(adminToken,u.id,ref)).rejects.toThrow();expect((await db.user.findUniqueOrThrow({where:{id:u.id}})).role).toBe("CUSTOMER");
 });
 it("requires a governance JWT on restore endpoints and denies ordinary SUPER_ADMIN bypass",async()=>{
  await request(app.getHttpServer()).post("/restore-governance/sessions").send({id:randomUUID()}).expect(401);
  await request(app.getHttpServer()).post("/restore-governance/sessions").set("Authorization",`Bearer ${adminToken}`).send({id:randomUUID()}).expect(401);
 });
 it("rejects the wrong authority and out-of-order release without audit publication",async()=>{
  const id=await session();expect((await post(id,0,token(3))).status).toBe(401);expect((await post(id,5)).status).toBeGreaterThanOrEqual(400);expect(independent.append).not.toHaveBeenCalled();
 });
 it("persists all ordered stages with exactly one immutable approval per stage",async()=>{
  const id=await session();for(let i=0;i<6;i++){const r=await post(id,i);expect(r.status).toBe(201);if(i<5)expect(r.body.stage).not.toBe("RELEASED");}
  const rows=(await events("RESTORE_APPROVAL_COMMITTED")).filter(e=>e.facts.sessionId===id);expect(rows).toHaveLength(6);expect(rows[0].facts.stage).toBe("RELEASED");
 });
 it("deduplicates an approval, including after a service restart",async()=>{
  const id=await session();await post(id,0).expect(201);
  const restarted=new GovernanceControlsService(db as PrismaService,jwt,config,auth,independent);
  const result=await restarted.approve(token(0),id,"replay-complete",ref);expect(result.duplicate).toBe(true);
  expect((await events("RESTORE_APPROVAL_COMMITTED")).filter(e=>e.facts.sessionId===id)).toHaveLength(1);
 });
 it("a lost external acknowledgement freezes the exact event and does not advance",async()=>{
  const id=await session();ambiguous=true;await expect(control.approve(token(0),id,"replay-complete",ref)).rejects.toThrow("LOST_ACK");
  const first=independent.append.mock.calls[0][0];
  await expect(control.approve(token(1),id,"replay-verified",ref)).rejects.toThrow();
  const r=await control.approve(token(0),id,"replay-complete",ref);expect(r.stage).toBe("JOURNAL_REPLAY_COMPLETE");expect(independent.append.mock.calls[1][0]).toEqual(first);
 });
 it("requires independent readback after a DB restore and never republishes missing history",async()=>{
  const id=await session();await control.approve(token(0),id,"replay-complete",ref);
  evidence.clear();independent.append.mockClear();await expect(control.approve(token(1),id,"replay-verified",ref)).rejects.toThrow("MISSING_HISTORY");expect(independent.append).not.toHaveBeenCalled();
 });
 it("changing a roster invalidates unfinished approval sessions",async()=>{
  const id=await session();await control.approve(token(0),id,"replay-complete",ref);
  const replacement=await identity();await control.changeAuthority(adminToken,"EXECUTIVE",{...ref,subject:replacement.id});
  await expect(control.approve(token(1),id,"replay-verified",ref)).rejects.toThrow();
 });
 it("disabled authority cannot approve an existing session",async()=>{
  const extra=await identity();await control.changeAuthority(adminToken,"EXECUTIVE",{...ref,subject:extra.id});
  const id=await session();const t=jwt.sign({sub:extra.id,scope:"restore-governance",cv:0},{expiresIn:900});
  await control.disable(adminToken,extra.id,ref);await expect(control.approve(t,id,"release",ref)).rejects.toThrow();
 });
 it("concurrent duplicate approval commits once",async()=>{
  const id=await session();const r=await Promise.all([control.approve(token(0),id,"replay-complete",ref),control.approve(token(0),id,"replay-complete",ref)]);
  expect(r.filter(x=>!x.duplicate)).toHaveLength(1);
  expect((await events("RESTORE_APPROVAL_COMMITTED")).filter(e=>e.facts.sessionId===id)).toHaveLength(1);
 });
 it("session creation is idempotent, including JSONB ordering",async()=>{
  const id=await session();expect((await control.create(token(0),id)).stage).toBe("RESTORED_QUARANTINED");
 });
 it("replay operator cannot self-release or satisfy another authority stage",async()=>{
  const id=await session();await post(id,0).expect(201);expect((await post(id,1,token(0))).status).toBe(401);expect((await post(id,5,token(0))).status).toBe(401);
 });
 it("default-off controls reject mutation before any journal I/O or mail",async()=>{
  flags.GOVERNANCE_ADMIN_PROVISIONING_ENABLED="false";await expect(control.changeAuthority(adminToken,"EXECUTIVE",{...ref,subject:null})).rejects.toThrow();
  flags.GOVERNANCE_EMAIL_AUTH_ENABLED="false";await expect(session()).rejects.toThrow();expect(independent.append).not.toHaveBeenCalled();expect(mail.send).not.toHaveBeenCalled();
 });
});
