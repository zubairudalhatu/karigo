import { Body, Controller, Get, Injectable, NotFoundException, Post, Req, UnauthorizedException, UseGuards, CanActivate, ExecutionContext, Optional, UseInterceptors, NestInterceptor, CallHandler } from "@nestjs/common";
import { catchError } from "rxjs/operators";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { PrismaService } from "../../prisma/prisma.service";
import { Transform } from "class-transformer";
import { IsEmail, IsString, Matches, MaxLength, MinLength, isEmail } from "class-validator";
import { compare, hash } from "bcrypt";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { governanceAudit } from "./governance-audit";

export const GOVERNANCE_SCOPE = "restore-governance";
const digest = (value: string) => createHash("sha256").update(value).digest("hex");
const isLoginRequest = (r:{path?:string;originalUrl?:string}) =>
  (r.path??r.originalUrl??"").split("?")[0].replace(/\/+$/,"").toLowerCase().endsWith("/admin-email/login");
const publicAdmin = (u: {id:string;fullName:string;email:string|null;role:string;adminRole:string|null}) =>
  ({id:u.id,fullName:u.fullName,email:u.email,role:u.role,adminRole:u.adminRole});
export class GovernanceEmailDto {
  @Transform(({value}) => typeof value === "string" ? value.trim().toLowerCase() : value)
  @IsEmail() @MaxLength(254) email!: string;
}
export class GovernanceLoginDto extends GovernanceEmailDto {
  @IsString() @MinLength(1) @MaxLength(72) password!: string;
}
export class GovernancePasswordDto {
  @IsString() @Matches(/^[A-Za-z0-9_-]{43}$/) token!: string;
  @IsString() @MinLength(12) @MaxLength(72) @Matches(/[a-z]/) @Matches(/[A-Z]/) @Matches(/\d/) newPassword!: string;
}

@Injectable()
export class GovernanceEmailSender {
  constructor(private readonly config: ConfigService) {}
  async send(to: string, token: string, purpose: "SETUP"|"RESET", challengeId: string) {
    const key = this.config.get<string>("RESEND_API_KEY");
    const from = this.config.get<string>("RESEND_FROM_EMAIL") ?? this.config.get<string>("EMAIL_FROM");
    const origin = this.config.get<string>("ADMIN_PORTAL_ORIGIN");
    if (!key || !from || !origin || new URL(origin).protocol !== "https:") throw new Error("GOVERNANCE_EMAIL_NOT_CONFIGURED");
    // Fragment is never transmitted in a page URL to the portal/server access log.
    const link = new URL("/governance-password", origin); link.hash = token;
    const response = await fetch("https://api.resend.com/emails", {method:"POST",headers:{Authorization:`Bearer ${key}`,"Content-Type":"application/json","Idempotency-Key":`governance-${challengeId}`},
      body:JSON.stringify({from,to:[to],subject:purpose === "SETUP" ? "Set up your KariGO restore-governance identity" : "Reset your KariGO restore-governance password",
        text:`Use this single-use link within 30 minutes to ${purpose === "SETUP" ? "verify your email and set your password" : "reset your password"}:\n${link}\n\nDo not share this link. Ignore this email if you did not expect it.`}),signal:AbortSignal.timeout(10000)});
    const payload = await response.json().catch(()=>({})) as {id?:string};
    if (!response.ok || !payload.id) throw new Error("GOVERNANCE_EMAIL_SUBMISSION_UNCONFIRMED");
    return payload.id; // No automatic retry or credential logging.
  }
}

@Injectable()
export class GovernanceAuthService {
  constructor(private readonly db: PrismaService, private readonly jwt: JwtService, private readonly config: ConfigService, private readonly mail: GovernanceEmailSender) {}
  private enabled() { if (this.config.get<string>("GOVERNANCE_EMAIL_AUTH_ENABLED") !== "true") throw new NotFoundException(); }
  private eligible(u: {role:string;adminRole:string|null;deletedAt:Date|null;email:string|null;phoneNumber:string|null}) {
    return u.role === "ADMIN" && u.adminRole === "RESTORE_GOVERNANCE" && !u.deletedAt && !!u.email && u.phoneNumber === null;
  }
  // Internal provisioning operation only. No public registration endpoint. Not called during implementation.
  async provision(actorToken: string, input: {name:string;email:string;mailboxReceiptVerified:boolean;approvalReference:string}) {
    this.enabled();
    if(this.config.get<string>("GOVERNANCE_ADMIN_PROVISIONING_ENABLED") !== "true") throw new NotFoundException();
    const actorClaims = await this.jwt.verifyAsync<{sub?:string;exp?:number}>(actorToken);
    if(!actorClaims.sub || !actorClaims.exp || actorClaims.exp*1000<=Date.now()) throw new UnauthorizedException();
    const actorId=actorClaims.sub;
    if (!input.mailboxReceiptVerified || !input.approvalReference.trim() || !input.name.trim()) throw new Error("GOVERNANCE_PROVISIONING_APPROVAL_REQUIRED");
    const email = input.email.trim().toLowerCase();
    if (!isEmail(email) || !/^[A-Za-z0-9._:/-]{1,128}$/.test(input.approvalReference)) throw new Error("INVALID_GOVERNANCE_PROVISIONING_INPUT");
    const identity = await this.db.$transaction(async tx => {
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext('governance-admin-provisioning'))::text`;
      const actor = await tx.user.findFirst({where:{id:actorId,role:"ADMIN",adminRole:"SUPER_ADMIN",accountStatus:"ACTIVE",deletedAt:null}});
      if (!actor) throw new UnauthorizedException();
      if (await tx.user.findFirst({where:{email:{equals:email,mode:"insensitive"}}})) throw new Error("GOVERNANCE_EMAIL_ALREADY_ASSOCIATED");
      const user = await tx.user.create({data:{fullName:input.name.trim(),email,phoneNumber:null,passwordHash:"",role:"ADMIN",adminRole:"RESTORE_GOVERNANCE",accountStatus:"PENDING",phoneVerified:false,emailVerified:false,
        adminEmailIdentity:{create:{emailKey:email}}}});
      await tx.adminAuditLog.create({data:{adminUserId:actor.id,action:"GOVERNANCE_ADMIN_PROVISIONED",entityType:"User",entityId:user.id,newValue:{approvalReference:input.approvalReference,capability:"RESTORE_GOVERNANCE",mailboxReceiptVerified:true}}});
      await governanceAudit(tx,"GOVERNANCE_ADMIN_PROVISIONED",actor.id,user.id,{approvalReference:input.approvalReference});
      return user;
    });
    await this.challenge(identity.id,"SETUP");
    return publicAdmin(identity);
  }
  // Explicit operator recovery only; never invoked automatically after an ambiguous send.
  async resendSetup(actorToken:string,userId:string,approvalReference:string) {
    this.enabled();
    if(this.config.get<string>("GOVERNANCE_ADMIN_PROVISIONING_ENABLED") !== "true") throw new NotFoundException();
    const claims=await this.jwt.verifyAsync<{sub?:string;exp?:number}>(actorToken);
    if(!claims.sub || !claims.exp || claims.exp*1000<=Date.now() || !/^[A-Za-z0-9._:/-]{1,128}$/.test(approvalReference)) throw new UnauthorizedException();
    const actor=await this.db.user.findFirst({where:{id:claims.sub,role:"ADMIN",adminRole:"SUPER_ADMIN",accountStatus:"ACTIVE",deletedAt:null}});
    if(!actor) throw new UnauthorizedException();
    await this.db.adminAuditLog.create({data:{adminUserId:actor.id,action:"GOVERNANCE_SETUP_REISSUE_APPROVED",entityType:"User",entityId:userId,newValue:{approvalReference}}});
    await this.challenge(userId,"SETUP");return {requestAccepted:true};
  }
  private async challenge(userId:string,purpose:"SETUP"|"RESET") {
    const raw = randomBytes(32).toString("base64url"), now=new Date(), id=randomUUID();
    const staged = await this.db.$transaction(async tx => {
      await tx.$queryRaw`SELECT "userId" FROM admin_email_identities WHERE "userId"=${userId}::uuid FOR UPDATE`;
      const identity = await tx.adminEmailIdentity.findUniqueOrThrow({where:{userId},include:{user:true}});
      const u=identity.user;
      if (!this.eligible(u) || identity.emailKey !== u.email?.toLowerCase() ||
        (purpose === "SETUP" ? u.accountStatus !== "PENDING" || u.emailVerified : u.accountStatus !== "ACTIVE" || !u.emailVerified)) return null;
      if (identity.lastChallengeAt && now.getTime()-identity.lastChallengeAt.getTime()<15*60*1000) return null;
      await tx.adminEmailChallenge.updateMany({where:{userId,consumedAt:null},data:{consumedAt:now}});
      await tx.adminEmailChallenge.create({data:{id,userId,purpose,tokenHash:digest(raw),expiresAt:new Date(now.getTime()+30*60*1000)}});
      await tx.adminEmailIdentity.update({where:{userId},data:{lastChallengeAt:now}});
      return u.email!;
    });
    if (!staged) return;
    try {
      const providerId=await this.mail.send(staged,raw,purpose,id);
      await this.db.adminAuditLog.create({data:{adminUserId:userId,action:"GOVERNANCE_EMAIL_ACCEPTED",entityType:"AdminEmailChallenge",entityId:id,newValue:{providerId,purpose}}});
    } catch {
      // Ambiguous submission: invalidate the capability; do not blindly resend.
      await this.db.adminEmailChallenge.updateMany({where:{id,consumedAt:null},data:{consumedAt:new Date()}});
      throw new Error("GOVERNANCE_EMAIL_NOT_CONFIRMED_NO_RETRY");
    }
  }
  async requestReset(email:string) {
    this.enabled();
    const identity=await this.db.adminEmailIdentity.findUnique({where:{emailKey:email.trim().toLowerCase()}});
    if (identity) { try { await this.challenge(identity.userId,"RESET"); } catch { /* uniform response, no raw exception or enumeration */ } }
    return {requestAccepted:true};
  }
  async finish(dto:GovernancePasswordDto) {
    this.enabled();
    if (Buffer.byteLength(dto.newPassword,"utf8")>72) throw new UnauthorizedException("Password exceeds supported length");
    const tokenHash=digest(dto.token), passwordHash=await hash(dto.newPassword,12);
    await this.db.$transaction(async tx => {
      const challenge=await tx.adminEmailChallenge.findUnique({where:{tokenHash}});
      if (!challenge) throw new UnauthorizedException("Invalid or expired setup/reset link");
      await tx.$queryRaw`SELECT "userId" FROM admin_email_identities WHERE "userId"=${challenge.userId}::uuid FOR UPDATE`;
      const identity=await tx.adminEmailIdentity.findUniqueOrThrow({where:{userId:challenge.userId},include:{user:true}}); const u=identity.user;
      if (!this.eligible(u) || identity.emailKey!==u.email?.toLowerCase() ||
        (challenge.purpose === "SETUP" ? u.accountStatus!=="PENDING" || u.emailVerified : challenge.purpose!=="RESET" || u.accountStatus!=="ACTIVE" || !u.emailVerified)) throw new UnauthorizedException();
      const consumed=await tx.adminEmailChallenge.updateMany({where:{id:challenge.id,consumedAt:null,expiresAt:{gt:new Date()}},data:{consumedAt:new Date()}});
      if (consumed.count!==1) throw new UnauthorizedException("Invalid or expired setup/reset link");
      await tx.user.update({where:{id:u.id},data:{passwordHash,emailVerified:true,accountStatus:"ACTIVE",onboardingPasswordSetAt:new Date()}});
      await tx.adminEmailIdentity.update({where:{userId:u.id},data:{credentialVersion:{increment:1},failedLogins:0,lockedUntil:null}});
      await tx.refreshToken.updateMany({where:{userId:u.id,revokedAt:null},data:{revokedAt:new Date()}});
      await tx.adminEmailChallenge.updateMany({where:{userId:u.id,consumedAt:null},data:{consumedAt:new Date()}});
      await tx.adminAuditLog.create({data:{adminUserId:u.id,action:challenge.purpose==="SETUP"?"GOVERNANCE_EMAIL_VERIFIED_AND_PASSWORD_SET":"GOVERNANCE_PASSWORD_RESET",entityType:"User",entityId:u.id}});
      await governanceAudit(tx,challenge.purpose==="SETUP"?"GOVERNANCE_EMAIL_VERIFIED_AND_PASSWORD_SET":"GOVERNANCE_PASSWORD_RESET",u.id,u.id,{});
    });
    return {passwordSet:true};
  }
  async login(dto:GovernanceLoginDto) {
    this.enabled(); const now=new Date();
    const result=await this.db.$transaction(async tx => {
      const found=await tx.adminEmailIdentity.findUnique({where:{emailKey:dto.email.trim().toLowerCase()}});
      if (!found) { await governanceAudit(tx,"GOVERNANCE_LOGIN_FAILED",null,null,{reason:"INVALID_CREDENTIALS"}); return null; }
      await tx.$queryRaw`SELECT "userId" FROM admin_email_identities WHERE "userId"=${found.userId}::uuid FOR UPDATE`;
      const identity=await tx.adminEmailIdentity.findUniqueOrThrow({where:{userId:found.userId},include:{user:true}});const u=identity.user;
      if (!this.eligible(u) || identity.emailKey!==u.email?.toLowerCase() || u.accountStatus!=="ACTIVE" || !u.emailVerified || !u.onboardingPasswordSetAt || !u.passwordHash || (identity.lockedUntil && identity.lockedUntil>now)) {
        await governanceAudit(tx,"GOVERNANCE_LOGIN_FAILED",null,u.id,{reason:identity.lockedUntil && identity.lockedUntil>now?"LOCKED":"INELIGIBLE"}); return null;
      }
      if (!await compare(dto.password,u.passwordHash)) {
        const failures=identity.failedLogins+1;
        await tx.adminEmailIdentity.update({where:{userId:u.id},data:{failedLogins:failures,lockedUntil:failures>=5?new Date(now.getTime()+15*60*1000):null}});
        await governanceAudit(tx,"GOVERNANCE_LOGIN_FAILED",null,u.id,{reason:"INVALID_CREDENTIALS"});
        return null;
      }
      await tx.adminEmailIdentity.update({where:{userId:u.id},data:{failedLogins:0,lockedUntil:null}});
      await tx.adminAuditLog.create({data:{adminUserId:u.id,action:"GOVERNANCE_EMAIL_LOGIN",entityType:"User",entityId:u.id}});
      await governanceAudit(tx,"GOVERNANCE_EMAIL_LOGIN",u.id,u.id,{});
      return {user:publicAdmin(u),version:identity.credentialVersion};
    },{timeout:15000});
    if (!result) throw new UnauthorizedException("Invalid email or password");
    return {user:result.user,accessToken:await this.jwt.signAsync({sub:result.user.id,role:"ADMIN",scope:GOVERNANCE_SCOPE,cv:result.version},{expiresIn:900})};
  }
  async authenticate(token:string) {
    this.enabled();
    let claims:{sub?:string;scope?:string;cv?:number;exp?:number};
    try { claims=await this.jwt.verifyAsync(token); } catch { throw new UnauthorizedException(); }
    if (claims.scope!==GOVERNANCE_SCOPE || !claims.sub || !Number.isInteger(claims.cv) || !claims.exp || claims.exp*1000<=Date.now()) throw new UnauthorizedException();
    const identity=await this.db.adminEmailIdentity.findUnique({where:{userId:claims.sub},include:{user:true}});
    if (!identity || !this.eligible(identity.user) || identity.emailKey!==identity.user.email?.toLowerCase() || identity.credentialVersion!==claims.cv || !identity.user.emailVerified || identity.user.accountStatus!=="ACTIVE") throw new UnauthorizedException();
    return publicAdmin(identity.user);
  }
  async logout(userId:string) { await this.db.adminEmailIdentity.update({where:{userId},data:{credentialVersion:{increment:1}}}); return {loggedOut:true}; }
}
@Injectable()
export class GovernanceAuthGuard implements CanActivate {
  constructor(private readonly auth:GovernanceAuthService) {}
  async canActivate(context:ExecutionContext) {
    const request=context.switchToHttp().getRequest<{headers:{authorization?:string};user?:unknown}>();
    const match=/^Bearer ([^ ]+)$/.exec(request.headers.authorization??"");
    if (!match) throw new UnauthorizedException(); request.user=await this.auth.authenticate(match[1]); return true;
  }
}
@Injectable()
export class GovernanceRequestLimitGuard implements CanActivate {
  constructor(@Optional() private readonly db?:PrismaService,@Optional() private readonly config?:ConfigService) {}
  private readonly windows = new Map<string,{count:number;until:number}>();
  async canActivate(context:ExecutionContext) {
    const request=context.switchToHttp().getRequest<{ip?:string;path?:string;originalUrl?:string}>(); const now=Date.now();
    // Express-derived peer only; never a caller-supplied identity/role header.
    const key=digest(request.ip ?? "unknown");
    for (const [k,v] of this.windows) if(v.until<=now) this.windows.delete(k);
    const value=this.windows.get(key)??{count:0,until:now+60000};
    const rejected=async()=>{
      if(isLoginRequest(request) && this.db && this.config?.get("GOVERNANCE_EMAIL_AUTH_ENABLED")==="true")
        await this.db.$transaction(tx=>governanceAudit(tx,"GOVERNANCE_LOGIN_FAILED",null,null,{reason:"RATE_LIMITED"}));
      throw new UnauthorizedException("Try again later");
    };
    if (this.windows.size>=10000 && !this.windows.has(key)) return rejected();
    value.count++;this.windows.set(key,value);
    if(value.count>20) return rejected(); return true;
  }
}
@Injectable()
export class GovernanceLoginValidationAudit implements NestInterceptor {
  constructor(private readonly db:PrismaService,private readonly config:ConfigService) {}
  intercept(context:ExecutionContext,next:CallHandler) {
    const req=context.switchToHttp().getRequest<{path?:string;originalUrl?:string}>();
    return next.handle().pipe(catchError(async error=>{
      if(isLoginRequest(req) && error?.getStatus?.()===400 && this.config.get("GOVERNANCE_EMAIL_AUTH_ENABLED")==="true")
        await this.db.$transaction(tx=>governanceAudit(tx,"GOVERNANCE_LOGIN_FAILED",null,null,{reason:"INVALID_INPUT"}));
      throw error;
    }));
  }
}
@Controller("auth/admin-email")
@UseGuards(GovernanceRequestLimitGuard)
@UseInterceptors(GovernanceLoginValidationAudit)
export class GovernanceAuthController {
  constructor(private readonly auth:GovernanceAuthService) {}
  @Post("login") async login(@Body() dto:GovernanceLoginDto) { return {data:await this.auth.login(dto)}; }
  @Post("password-reset/request") async reset(@Body() dto:GovernanceEmailDto) { return {data:await this.auth.requestReset(dto.email)}; }
  @Post("password/complete") async finish(@Body() dto:GovernancePasswordDto) { return {data:await this.auth.finish(dto)}; }
  @Get("me") @UseGuards(GovernanceAuthGuard) me(@Req() request:{user:unknown}) { return {data:request.user}; }
  @Post("logout") @UseGuards(GovernanceAuthGuard) async logout(@Req() request:{user:{id:string}}) { return {data:await this.auth.logout(request.user.id)}; }
}
