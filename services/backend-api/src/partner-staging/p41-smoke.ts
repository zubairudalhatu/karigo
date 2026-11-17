import {randomInt,randomUUID} from "crypto";
import {hash} from "bcrypt";
import {PrismaService} from "../prisma/prisma.service";
import {stageId} from "./seed";
export async function p41Smoke(app:any,origin:string) {
 if(process.env.PARTNER_ISOLATED_STAGING!=="true"||process.env.APP_ENV!=="staging"||!/^\/karigo_partner_p25(?:_[a-z0-9]+)?$/.test(new URL(process.env.DATABASE_URL!).pathname))throw Error("P41_STAGING_ONLY");
 const db=app.get(PrismaService) as PrismaService,checks:Record<string,string>={},sessions:any[]=[];
 const check=(ok:unknown,name:string)=>{if(!ok)throw Error("P41_CHECK_"+name);checks[name]="PASS";};
 async function request(path:string,token?:string,method="GET",body?:unknown,status:number|number[]=200):Promise<any>{
  const r=await fetch(origin+"/api/v1/"+path,{method,redirect:"error",headers:{"Content-Type":"application/json",...(token?{Authorization:"Bearer "+token}:{})},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(20000)});
  if(!(Array.isArray(status)?status:[status]).includes(r.status))throw Error("P41_HTTP_"+r.status+"_"+path.split("/").slice(0,2).join("_"));
  if(r.status>=400)return;
  const j=await r.json();return j.data??j;
 }
 const login=async(phoneNumber:string)=>{const s=await request("partner-mobile/session",undefined,"POST",{phoneNumber,password:process.env.STAGING_QA_PASSWORD},201);sessions.push(s);return s.accessToken as string;};
 const owner=await db.user.findUniqueOrThrow({where:{id:stageId(1)}}),other=await db.user.findUniqueOrThrow({where:{id:stageId(2)}});
 const vendor=await db.vendor.findUniqueOrThrow({where:{userId:owner.id}});
 if(!owner.email?.endsWith("@partner-stage.invalid")||!other.email?.endsWith("@partner-stage.invalid"))throw Error("P41_FIXTURE_MARKER_REQUIRED");
 const passwordHash=await hash(process.env.STAGING_QA_PASSWORD!,12);
 let phoneNumber="";for(let i=0;i<30;i++){const candidate="+2348000000"+randomInt(100,999);if(!await db.user.findUnique({where:{phoneNumber:candidate}})){phoneNumber=candidate;break;}}
 if(!phoneNumber)throw Error("P41_PHONE_UNAVAILABLE");
 const staff=await db.user.create({data:{fullName:"[STAGING] P41 restricted",email:"p41-"+randomUUID()+"@partner-stage.invalid",phoneNumber,passwordHash,role:"VENDOR",accountStatus:"ACTIVE",phoneVerified:true}});
 // This is a pending invitation record, not implemented staff login/access.
 const member=await db.vendorTeamMember.create({data:{vendorId:vendor.id,userId:staff.id,fullName:"[STAGING] P41 restricted",role:"VIEWER",invitationStatus:"PENDING",invitedByUserId:owner.id}});
 try{
 const a=await login(owner.phoneNumber!),b=await login(other.phoneNumber!),restricted=await login(phoneNumber);
 const summary=await request("vendors/operations-summary",a);check(summary.workspaceRole==="OWNER"&&summary.canManageTeamInvitations,"authorized_owner");
 await request("vendors/team/"+member.id,restricted,"PATCH",{role:"MANAGER"},[401,403]);checks.restricted_mutation_denied="PASS";
 await request("vendors/team/"+member.id,restricted,"PATCH",{role:"OWNER"},[401,403]);checks.self_escalation_denied="PASS";
 await request("vendors/team/"+member.id,b,"PATCH",{role:"MANAGER"},404);checks.cross_business_denied="PASS";
 await request("vendors/team/"+member.id,a,"PATCH",{role:"OWNER"},400);checks.owner_role_escalation_denied="PASS";
 const order=await db.order.findFirstOrThrow({where:{vendorId:vendor.id,orderStatus:"CANCELLED"},select:{id:true,orderStatus:true}});
 const notice=await db.notification.create({data:{userId:owner.id,type:"SYSTEM_ALERT",title:"[STAGING] P41 order update",message:"Synthetic order status changed. No personal data.",entityType:"Order",entityId:order.id}});
 const list=await request("vendors/notifications",a),entry=list.find((n:any)=>n.id===notice.id);
 check(entry&&entry.isRead===false,"notification_unread");
 check(Object.keys(entry).every(k=>["id","title","message","isRead","createdAt"].includes(k))&&entry.message==="Open Partner to view the current information.","notification_payload_privacy");
 await request("vendors/notifications/"+notice.id+"/read",a,"PATCH",{});
 check((await request("vendors/notifications",a)).find((n:any)=>n.id===notice.id)?.isRead,"notification_read_persisted");
 const target=await request("vendors/notifications/"+notice.id+"/target",a);
 check(target.route==="order"&&target.id===order.id,"authorized_notification_target");
 await request("vendors/notifications/"+notice.id+"/target",b,"GET",undefined,404);
 await request("vendor-dashboard/orders/"+order.id,b,"GET",undefined,404);checks.foreign_destination_denied="PASS";
 const detail=await request("vendor-dashboard/orders/"+target.id,a);check(detail.orderStatus==="CANCELLED","stale_notification_refresh");
 // Earlier restoration tried null fixture hours; current update contract only accepts HH:mm strings.
 const profile=await request("vendors/me",a),manual=profile.isOpen;
 await request("vendors/me",a,"PATCH",{openingTime:"09:00",closingTime:"17:00"});
 const cleaned=await request("vendors/me",a);check(cleaned.openingTime==="09:00"&&cleaned.closingTime==="17:00"&&cleaned.isOpen===manual,"hours_fixture_clean");
 const [capabilities,orders,products,services,commercial,launch,operations]=await Promise.all([
 request("vendors/capabilities",a),request("vendor-dashboard/orders",a),request("vendor/products",a),request("vendors/services",a),request("partner-commercial/me",a),request("launch/availability/me?city=Abuja",a),request("vendors/operations-summary",a)]);
 // Only synthetic/minimized values needed by deterministic Home rendering leave this harness.
 const dashboard={profile:{businessName:cleaned.businessName,city:cleaned.city,state:cleaned.state,status:cleaned.status,isOpen:cleaned.isOpen},capabilities,orders:orders.map((o:any)=>({id:o.id,orderNumber:o.orderNumber,orderStatus:o.orderStatus,totalAmount:o.totalAmount,itemsCount:o.itemsCount})),products:products.map((p:any)=>({id:p.id,name:p.name,isAvailable:p.isAvailable})),services:services.map((s:any)=>({id:s.id,name:s.name,status:s.status})),documents:[],commercial,launch,operations};
 return {source:process.env.RENDER_GIT_COMMIT,checks,dashboard,teamAcceptanceSupported:false,financialMutation:false};
 }catch(error){
 const code=error instanceof Error&&/^P41_[A-Za-z0-9_]+$/.test(error.message)?error.message:"P41_CHECK_FAILED";
 return {source:process.env.RENDER_GIT_COMMIT,failed:true,code,checks};
 }finally{
  await db.vendorTeamMember.update({where:{id:member.id},data:{invitationStatus:"REVOKED",revokedAt:new Date()}});
  for(const s of sessions)await request("partner-mobile/session/logout",s.accessToken,"POST",{refreshToken:s.refreshToken},201);
  await db.user.update({where:{id:staff.id},data:{accountStatus:"SUSPENDED"}});
 }
}
