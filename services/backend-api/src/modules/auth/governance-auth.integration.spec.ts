import { PrismaClient } from "@prisma/client";
import { JwtService } from "@nestjs/jwt";
import { randomBytes, randomUUID } from "node:crypto";
import { hash } from "bcrypt";
import { ConfigService } from "@nestjs/config";
import { GovernanceAuthService, GovernanceEmailSender, GOVERNANCE_SCOPE } from "./governance-auth";
import { PrismaService } from "../../prisma/prisma.service";
import { JwtStrategy } from "./jwt.strategy";
import { UsersService } from "../users/users.service";
import { PrismaReleaseActorRepository, RestoreReleaseSession } from "../account-deletion/restore-release";
const url=process.env.KARIGO_GOVERNANCE_TEST_DATABASE_URL;
if(url){const p=new URL(url);if(p.hostname!=="127.0.0.1"||p.port!=="55439"||!["/karigo_governance_qa_20261015","/karigo_governance_migration_20261016"].includes(p.pathname))throw new Error("Dedicated loopback synthetic database required");}
const suite=url?describe:describe.skip;
jest.setTimeout(60000);
suite("Email-only restore governance — isolated PostgreSQL",()=>{
 const db=new PrismaClient({datasourceUrl:url}); const jwt=new JwtService({secret:"synthetic-governance-fixture-only"});
 const flags:Record<string,string>={GOVERNANCE_EMAIL_AUTH_ENABLED:"true",GOVERNANCE_ADMIN_PROVISIONING_ENABLED:"true"};
 const config={get:(key:string)=>flags[key]} as ConfigService;
 const mail={send:jest.fn().mockResolvedValue("synthetic-provider-id")};
 const auth=new GovernanceAuthService(db as PrismaService,jwt,config,mail as unknown as GovernanceEmailSender);
 let actor:string;
 const password="SyntheticFixturePassword99";
 const provision=async()=>{const name=`Synthetic Authority ${randomUUID()}`; const email=`${randomUUID()}@example.invalid`;
  const before=mail.send.mock.calls.length;
  const user=await auth.provision(jwt.sign({sub:actor},{expiresIn:300}),{name,email,mailboxReceiptVerified:true,approvalReference:"SYNTHETIC-LOCAL-ONLY"});
  return {user,token:mail.send.mock.calls[before][1] as string,email};};
 beforeAll(async()=>{actor=(await db.user.create({data:{fullName:"Synthetic Provisioning Operator",phoneNumber:`fixture:${randomUUID()}`,passwordHash:"fixture",role:"ADMIN",adminRole:"SUPER_ADMIN",accountStatus:"ACTIVE"}})).id;});
 afterAll(async()=>db.$disconnect());
 afterEach(()=>{flags.GOVERNANCE_EMAIL_AUTH_ENABLED="true";flags.GOVERNANCE_ADMIN_PROVISIONING_ENABLED="true";});
 it("reissues an expired pending setup with provisioning OFF, preserving identity and memberships",async()=>{
  const {user}=await provision();const before=await db.user.findUniqueOrThrow({where:{id:user.id}});
  await db.adminEmailIdentity.update({where:{userId:user.id},data:{lastChallengeAt:new Date(0)}});
  await db.adminEmailChallenge.updateMany({where:{userId:user.id},data:{expiresAt:new Date(0)}});
  flags.GOVERNANCE_ADMIN_PROVISIONING_ENABLED="false";const sends=mail.send.mock.calls.length,users=await db.user.count();
  const actorToken=jwt.sign({sub:actor},{expiresIn:300});
  expect((await auth.resendSetup(actorToken,user.id,"SYNTHETIC-REISSUE-OFF")).challengeIssued).toBe(true);
  expect(mail.send.mock.calls.length-sends).toBe(1);expect(await db.user.count()).toBe(users);
  expect(await db.user.findUniqueOrThrow({where:{id:user.id}})).toEqual(before);
  const challenges=await db.adminEmailChallenge.findMany({where:{userId:user.id}});
  expect(challenges).toHaveLength(2);expect(challenges.filter(c=>!c.consumedAt&&c.expiresAt>new Date())).toHaveLength(1);
  expect(challenges.find(c=>c.expiresAt.getTime()===0)?.consumedAt).not.toBeNull();
  const fresh=challenges.find(c=>!c.consumedAt)!;expect(fresh.expiresAt.getTime()-fresh.createdAt.getTime()).toBeGreaterThan(29*60*1000);
  expect(fresh.expiresAt.getTime()-fresh.createdAt.getTime()).toBeLessThanOrEqual(30*60*1000);
  expect(fresh.tokenHash).toMatch(/^[a-f0-9]{64}$/);
  await expect(auth.provision(actorToken,{name:"Synthetic fifth",email:`${randomUUID()}@example.invalid`,mailboxReceiptVerified:true,approvalReference:"SYNTHETIC"})).rejects.toThrow();
  expect(await db.user.count()).toBe(users);
  const audits=await db.adminAuditLog.findMany({where:{action:"GOVERNANCE_SETUP_CHALLENGE_REISSUED",entityId:user.id}});
  expect(audits).toHaveLength(1);expect(audits[0].adminUserId).toBe(actor);
  expect(JSON.stringify(audits)).not.toContain(mail.send.mock.calls.at(-1)![1]);
  // Same reference remains deduplicated even after the rate-limit window.
  await db.adminEmailIdentity.update({where:{userId:user.id},data:{lastChallengeAt:new Date(0)}});
  expect((await auth.resendSetup(actorToken,user.id,"SYNTHETIC-REISSUE-OFF")).challengeIssued).toBe(false);
  expect(mail.send.mock.calls.length-sends).toBe(1);
 });
 it("serializes concurrent reissues and rate-limits a different reference",async()=>{
  const {user}=await provision();await db.adminEmailIdentity.update({where:{userId:user.id},data:{lastChallengeAt:new Date(0)}});
  flags.GOVERNANCE_ADMIN_PROVISIONING_ENABLED="false";const sends=mail.send.mock.calls.length,t=jwt.sign({sub:actor},{expiresIn:300});
  const results=await Promise.all([auth.resendSetup(t,user.id,"SYNTHETIC-CONCURRENT-A"),auth.resendSetup(t,user.id,"SYNTHETIC-CONCURRENT-B")]);
  expect(results.filter(r=>r.challengeIssued)).toHaveLength(1);expect(mail.send.mock.calls.length-sends).toBe(1);
  expect(await db.adminEmailChallenge.count({where:{userId:user.id,consumedAt:null,expiresAt:{gt:new Date()}}})).toBe(1);
 });
 it.each(["missing","ordinary","active","disabled","deleted","email-mismatch","password-set"])("rejects setup reissue for %s target without sending",async kind=>{
  const {user}=await provision();let id=user.id;
  if(kind==="missing")id=randomUUID();
  if(kind==="ordinary")id=actor;
  if(kind==="active")await db.user.update({where:{id},data:{accountStatus:"ACTIVE",emailVerified:true,onboardingPasswordSetAt:new Date()}});
  if(kind==="disabled")await db.user.update({where:{id},data:{accountStatus:"DEACTIVATED"}});
  if(kind==="deleted")await db.user.update({where:{id},data:{deletedAt:new Date()}});
  if(kind==="email-mismatch")await db.adminEmailIdentity.update({where:{userId:id},data:{emailKey:`${randomUUID()}@example.invalid`}});
  if(kind==="password-set")await db.user.update({where:{id},data:{passwordHash:"synthetic-established"}});
  flags.GOVERNANCE_ADMIN_PROVISIONING_ENABLED="false";const sends=mail.send.mock.calls.length;
  await expect(auth.resendSetup(jwt.sign({sub:actor},{expiresIn:300}),id,"SYNTHETIC-REJECT")).rejects.toThrow();expect(mail.send.mock.calls.length).toBe(sends);
 });
 it("rejects governance-scoped and expired actor tokens, and email-auth OFF",async()=>{
  const {user}=await provision();const sends=mail.send.mock.calls.length;
  await expect(auth.resendSetup(jwt.sign({sub:actor,scope:GOVERNANCE_SCOPE},{expiresIn:300}),user.id,"SYNTHETIC")).rejects.toThrow();
  await expect(auth.resendSetup(jwt.sign({sub:actor},{expiresIn:-1}),user.id,"SYNTHETIC")).rejects.toThrow();
  flags.GOVERNANCE_EMAIL_AUTH_ENABLED="false";
  await expect(auth.resendSetup(jwt.sign({sub:actor},{expiresIn:300}),user.id,"SYNTHETIC")).rejects.toThrow();expect(mail.send.mock.calls.length).toBe(sends);
 });
 it("is disabled by default before touching accounts or mail",async()=>{
  const disabled=new GovernanceAuthService(db as PrismaService,jwt,{get:()=>undefined} as unknown as ConfigService,mail as unknown as GovernanceEmailSender);
  const count=await db.user.count();await expect(disabled.provision("unused",{name:"Synthetic",email:"unused@example.invalid",mailboxReceiptVerified:true,approvalReference:"fixture"})).rejects.toThrow();expect(await db.user.count()).toBe(count);
 });
 it("requires an authenticated active provisioning Admin and mailbox approval",async()=>{
  await expect(auth.provision("forged",{name:"Synthetic",email:"unused@example.invalid",mailboxReceiptVerified:true,approvalReference:"fixture"})).rejects.toThrow();
  await expect(auth.provision(jwt.sign({sub:actor},{expiresIn:300}),{name:"Synthetic",email:"unused@example.invalid",mailboxReceiptVerified:false,approvalReference:"fixture"})).rejects.toThrow();
 });
 it("creates a pending email-only limited identity with no business membership and an audited creator",async()=>{
  const {user}=await provision();const row=await db.user.findUniqueOrThrow({where:{id:user.id},include:{customerProfile:true,vendor:true,rider:true}});
  expect(row.phoneNumber).toBeNull();expect(row.adminRole).toBe("RESTORE_GOVERNANCE");expect(row.accountStatus).toBe("PENDING");expect(row.emailVerified).toBe(false);expect(row.passwordHash).toBe("");
  expect(row.customerProfile).toBeNull();expect(row.vendor).toBeNull();expect(row.rider).toBeNull();
  expect(await db.adminAuditLog.count({where:{entityId:user.id,action:"GOVERNANCE_ADMIN_PROVISIONED",adminUserId:actor}})).toBe(1);
 });
 it("keeps Customer and Vendor phones mandatory at the database boundary",async()=>{
  for(const role of ["CUSTOMER","VENDOR","RIDER","ADMIN"] as const)await expect(db.user.create({data:{fullName:"Synthetic",email:`${randomUUID()}@example.invalid`,phoneNumber:null,passwordHash:"fixture",role}})).rejects.toThrow();
 });
 it("does not reuse an existing Customer mailbox, including case variants",async()=>{
  const email=`${randomUUID()}@example.invalid`;const row=await db.user.create({data:{fullName:"Synthetic Customer",email,phoneNumber:`fixture:${randomUUID()}`,passwordHash:"fixture",role:"CUSTOMER"}});
  await expect(auth.provision(jwt.sign({sub:actor},{expiresIn:300}),{name:"Synthetic",email:email.toUpperCase(),mailboxReceiptVerified:true,approvalReference:"fixture"})).rejects.toThrow("ALREADY_ASSOCIATED");
  expect((await db.user.findUniqueOrThrow({where:{id:row.id}})).role).toBe("CUSTOMER");
 });
 it("rejects unverified, incorrect, expired and reused setup links",async()=>{
  const {user,token,email}=await provision();await expect(auth.login({email,password})).rejects.toThrow();
  await expect(auth.finish({token:randomBytes(32).toString("base64url"),newPassword:password})).rejects.toThrow();
  await auth.finish({token,newPassword:password});await expect(auth.finish({token,newPassword:password})).rejects.toThrow();
  const row=await db.user.findUniqueOrThrow({where:{id:user.id}});expect(row.emailVerified).toBe(true);expect(row.accountStatus).toBe("ACTIVE");
 });
 it("permits only one of two simultaneous setup confirmations",async()=>{
  const {token}=await provision();const results=await Promise.allSettled([auth.finish({token,newPassword:password}),auth.finish({token,newPassword:password})]);expect(results.filter(r=>r.status==="fulfilled")).toHaveLength(1);
 });
 it("issues the exact individual users.id as a short-lived scoped JWT subject, without a refresh token",async()=>{
  const {user,token,email}=await provision();await auth.finish({token,newPassword:password});const result=await auth.login({email,password});const claims=await jwt.verifyAsync(result.accessToken);
  expect(claims.sub).toBe(user.id);expect(claims.scope).toBe(GOVERNANCE_SCOPE);expect(claims.exp-claims.iat).toBe(900);expect(result).not.toHaveProperty("refreshToken");
  expect((await auth.authenticate(result.accessToken)).id).toBe(user.id);
 });
 it("denies governance sessions in the ordinary JWT/API flow",async()=>{
  const {user,token,email}=await provision();await auth.finish({token,newPassword:password});const result=await auth.login({email,password});
  const strategy=new JwtStrategy({getOrThrow:()=>"synthetic-governance-fixture-only"} as never,new UsersService(db as PrismaService));
  await expect(strategy.validate(await jwt.verifyAsync(result.accessToken))).rejects.toThrow();
  await expect(auth.authenticate(jwt.sign({sub:user.id},{expiresIn:300}))).rejects.toThrow();
  await db.user.update({where:{id:user.id},data:{adminRole:"SUPER_ADMIN",phoneNumber:`fixture:${randomUUID()}`}});
  await expect(strategy.validate(await jwt.verifyAsync(result.accessToken))).rejects.toThrow();
 });
 it("keeps release blocked without an approved authority roster",async()=>{
  const {token,email}=await provision();await auth.finish({token,newPassword:password});const result=await auth.login({email,password});
  const session=new RestoreReleaseSession({instanceId:"synthetic",databaseIdentityHash:"a".repeat(64),manifestDigest:"b".repeat(64),coverage:"synthetic"},jwt,new PrismaReleaseActorRepository(db),()=>{throw new Error("ROSTER_MISSING");},{append:jest.fn()});
  await expect(session.replayComplete(result.accessToken)).rejects.toThrow("ROSTER_MISSING");expect(()=>session.assertOperational()).toThrow("QUARANTINED");
 });
 it("resets only via the individual mailbox and invalidates all previous JWTs",async()=>{
  const {user,token,email}=await provision();await auth.finish({token,newPassword:password});const first=await auth.login({email,password});
  await db.adminEmailIdentity.update({where:{userId:user.id},data:{lastChallengeAt:null}});const calls=mail.send.mock.calls.length;
  await auth.requestReset(email);const resetToken=mail.send.mock.calls[calls][1] as string;
  await auth.finish({token:resetToken,newPassword:"AnotherSyntheticPassword88"});
  await expect(auth.authenticate(first.accessToken)).rejects.toThrow();await expect(auth.login({email,password})).rejects.toThrow();
  expect((await auth.login({email,password:"AnotherSyntheticPassword88"})).user.id).toBe(user.id);
 });
 it("rejects expired reset links and rate-limits repeat challenge requests",async()=>{
  const {user,token,email}=await provision();await auth.finish({token,newPassword:password});await db.adminEmailIdentity.update({where:{userId:user.id},data:{lastChallengeAt:null}});
  const count=mail.send.mock.calls.length;await auth.requestReset(email);await auth.requestReset(email);expect(mail.send.mock.calls.length-count).toBe(1);
  const resetToken=mail.send.mock.calls[count][1] as string;await db.adminEmailChallenge.updateMany({where:{userId:user.id,consumedAt:null},data:{expiresAt:new Date(0)}});
  await expect(auth.finish({token:resetToken,newPassword:password})).rejects.toThrow();
 });
 it("locks repeated invalid passwords and refuses disabled identities",async()=>{
  const {user,token,email}=await provision();await auth.finish({token,newPassword:password});for(let i=0;i<5;i++)await expect(auth.login({email,password:"wrong"})).rejects.toThrow();
  await expect(auth.login({email,password})).rejects.toThrow();expect((await db.adminEmailIdentity.findUniqueOrThrow({where:{userId:user.id}})).lockedUntil).not.toBeNull();
  await db.user.update({where:{id:user.id},data:{accountStatus:"SUSPENDED"}});await expect(auth.login({email,password})).rejects.toThrow();
 });
 it("logs out by invalidating the individual credential version",async()=>{
  const {user,token,email}=await provision();await auth.finish({token,newPassword:password});const result=await auth.login({email,password});await auth.logout(user.id);await expect(auth.authenticate(result.accessToken)).rejects.toThrow();
 });
 it("serializes simultaneous provisioning without creating a duplicate identity",async()=>{
  const email=`${randomUUID()}@example.invalid`, input={name:"Synthetic Concurrent Authority",email,mailboxReceiptVerified:true,approvalReference:"SYNTHETIC-LOCAL-ONLY"};
  const actorToken=jwt.sign({sub:actor},{expiresIn:300});const results=await Promise.allSettled([auth.provision(actorToken,input),auth.provision(actorToken,input)]);
  expect(results.filter(r=>r.status==="fulfilled")).toHaveLength(1);expect(await db.user.count({where:{email}})).toBe(1);
 });
 it("requires distinct verified identity JWTs for the complete synthetic release sequence",async()=>{
  const identities: Awaited<ReturnType<GovernanceAuthService["login"]>>[]=[];for(let i=0;i<4;i++){const f=await provision();await auth.finish({token:f.token,newPassword:password});identities.push(await auth.login({email:f.email,password}));}
  const keys=["REPLAY_OPERATOR","TECHNICAL_VERIFIER","LEGAL_COMPLIANCE","EXECUTIVE"] as const;
  const roster=Object.fromEntries(keys.map((k,i)=>[k,[identities[i].user.id]])) as Record<typeof keys[number],string[]>;
  const session=new RestoreReleaseSession({instanceId:"synthetic",databaseIdentityHash:"a".repeat(64),manifestDigest:"b".repeat(64),coverage:"synthetic"},jwt,new PrismaReleaseActorRepository(db),()=>roster,{append:async e=>({generation:"123",verifiedDigest:e.digest})});
  await session.replayComplete(identities[0].accessToken);await expect(session.replayVerified(identities[0].accessToken)).rejects.toThrow();
  await session.replayVerified(identities[1].accessToken);await session.technicalApproval(identities[1].accessToken);await session.legalApproval(identities[2].accessToken);await session.executiveApproval(identities[3].accessToken);await session.release(identities[3].accessToken);
  expect(()=>session.assertOperational()).not.toThrow();
 });
 it("leaves a failed setup pending, invalidates the ambiguous capability and supports only explicit operator recovery",async()=>{
  const email=`${randomUUID()}@example.invalid`, input={name:"Synthetic Recovery Authority",email,mailboxReceiptVerified:true,approvalReference:"SYNTHETIC-LOCAL-ONLY"};
  const actorToken=jwt.sign({sub:actor},{expiresIn:300});const before=mail.send.mock.calls.length;mail.send.mockRejectedValueOnce(new Error("synthetic transport detail"));
  await expect(auth.provision(actorToken,input)).rejects.toThrow("NO_RETRY");expect(mail.send.mock.calls.length-before).toBe(1);
  const u=await db.user.findUniqueOrThrow({where:{email}});expect(u.accountStatus).toBe("PENDING");expect(u.emailVerified).toBe(false);
  expect(await db.adminEmailChallenge.count({where:{userId:u.id,consumedAt:null}})).toBe(0);
  await expect(auth.provision(actorToken,input)).rejects.toThrow("ALREADY_ASSOCIATED");
  await db.adminEmailIdentity.update({where:{userId:u.id},data:{lastChallengeAt:null}});
  await auth.resendSetup(actorToken,u.id,"SYNTHETIC-EXPLICIT-RECOVERY");const token=mail.send.mock.calls.at(-1)![1] as string;
  await auth.finish({token,newPassword:password});expect((await auth.login({email,password})).user.id).toBe(u.id);
 });
 it("keeps all four synthetic subject UUIDs distinct without assigning authorities",async()=>{
  const ids=[];for(let i=0;i<4;i++)ids.push((await provision()).user.id);expect(new Set(ids).size).toBe(4);
 });
});
