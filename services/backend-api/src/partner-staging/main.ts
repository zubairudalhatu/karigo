import { NestFactory } from "@nestjs/core";
import { NestExpressApplication } from "@nestjs/platform-express";
import { ConfigService } from "@nestjs/config";
import { json } from "express";
import { dirname, join } from "path";
import { timingSafeEqual } from "crypto";
import { mkdirSync, existsSync, writeFileSync } from "fs";
import { stagingSmoke } from "./smoke";
import { AppModule } from "../app.module";
import { configureApp } from "../app.setup";
import { ExpoPushProvider } from "../modules/notifications/push/providers/expo-push.provider";
import { ReadinessService } from "../modules/health/readiness.service";
const events: Array<Record<string,unknown>>=[];
export function evidence(event: string, values: Record<string,unknown>={}) {
  const item={at:new Date().toISOString(),environment:"partner-staging",event,...values};
  events.push(item); if(events.length>100)events.shift(); process.stdout.write(JSON.stringify(item)+"\n");
}
export async function startStaging(identity: Record<string,string>) {
  const app=await NestFactory.create<NestExpressApplication>(AppModule,{logger:false,rawBody:true});
  const push=app.get(ExpoPushProvider);
  push.sendBulkPushNotifications=async messages => {
    if(messages.some(m=>!/^ExpoPushToken\[PARTNER_STAGE_[A-Za-z0-9_-]+\]$/.test(m.toDeviceToken))) throw Error("STAGING_DEVICE_NOT_SYNTHETIC");
    for(const m of messages) evidence("push.mock_result",{route:m.data?.route,entityId:m.data?.entityId,appSurface:m.data?.appSurface,scheme:"karigo-partner-staging",accepted:true});
    return {accepted:messages.length,provider:"expo"};
  };
  push.sendPushNotification=async message=>{const r=await push.sendBulkPushNotifications([message]);return {accepted:r.accepted===1,provider:"expo"};};
  app.use(json({limit:"1mb"}));
  app.use((req:any,res:any,next:any)=>{
    res.setHeader("X-KariGO-Environment","partner-staging");
    if(req.path==="/health")return res.json({status:"ok",environment:"partner-staging"});
    if(req.path==="/ready")return void app.get(ReadinessService).ready().then(ok=>res.status(ok?200:503).json({status:ok?"ready":"not_ready",environment:"partner-staging",source:process.env.RENDER_GIT_COMMIT||"local",...identity}));
    if(req.path==="/staging/evidence") {
      const token=Buffer.from(req.headers.authorization?.replace(/^Bearer /,"")??""),expected=Buffer.from(process.env.STAGING_OPERATOR_SECRET!);
      return token.length===expected.length&&timingSafeEqual(token,expected)?res.json({events}):res.sendStatus(401);
    }
    if(!/^\/(?:api\/v1\/(?:health|partner-mobile|auth\/(?:vendor-onboarding|refresh|logout|me|password-reset)|vendors|vendor-dashboard\/orders|vendor\/(?:products|settlements|payout-account)|partner-commercial|launch\/availability|notifications)|uploads\/vendors)(?:\/|$)/.test(req.path))return res.sendStatus(404);
    if(req.path==="/api/v1/partner-mobile/push/device" && req.method==="POST" && !/^ExpoPushToken\[PARTNER_STAGE_[A-Za-z0-9_-]+\]$/.test(req.body?.token))return res.status(409).json({message:"Staging APNs is deferred; synthetic registrations only."});
    if(req.path.includes("/auth/vendor-onboarding/account") && (!req.body?.fullName?.startsWith("[STAGING]") || !req.body?.email?.endsWith("@partner-stage.invalid") || !/^\+2348000000\d{3}$/.test(req.body?.phoneNumber)))return res.status(400).json({message:"Synthetic staging identity required"});
    res.on("finish",()=>evidence("api.result",{method:req.method,status:res.statusCode,area:req.path.split("/")[3]||"uploads",operation:["accept","reject","preparing","ready","logout","permanent-deletion","files","uploads","device","preferences","draft","session","verification"].includes(req.path.split("/").at(-1))?req.path.split("/").at(-1):"read_or_setup"})); next();
  });
  mkdirSync("uploads",{recursive:true});app.useStaticAssets("uploads",{prefix:"/uploads/"});
  configureApp(app,app.get(ConfigService));
  await app.listen(Number(process.env.PORT||4000),"0.0.0.0");
  evidence("boot.ready",identity);
  const receipt=join(dirname(process.env.PARTNER_PRIVATE_STORAGE_LOCAL_ROOT!),"smoke-p25.json");
  if(process.env.STAGING_RUN_BOOT_SMOKE==="true"&&!existsSync(receipt)) {
    try {
      const checks=await stagingSmoke(app,`http://127.0.0.1:${process.env.PORT||4000}`);
      writeFileSync(receipt,JSON.stringify({checks,source:process.env.RENDER_GIT_COMMIT||"local"}));
      evidence("smoke.complete",{checks});
    } catch(error) { evidence("smoke.failed",{code:error instanceof Error&&/^SMOKE_|^[a-z_]+$/.test(error.message)?error.message.slice(0,100):"CHECK_FAILED"}); }
  }
}
