import { GovernanceEmailSender, GovernanceRequestLimitGuard, GovernancePasswordDto } from "./governance-auth";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
describe("Governance email delivery and request safety",()=>{
 afterEach(()=>jest.restoreAllMocks());
 it("sends a single capability in a fragment to one mailbox without retrying",async()=>{
  const fetcher=jest.spyOn(global,"fetch").mockResolvedValue({ok:true,json:async()=>({id:"synthetic-provider-id"})} as Response);
  const config={get:(key:string)=>({RESEND_API_KEY:"synthetic-not-a-real-key",RESEND_FROM_EMAIL:"sender@example.invalid",ADMIN_PORTAL_ORIGIN:"https://synthetic-admin.example"})[key as "RESEND_API_KEY"]};
  const sender=new GovernanceEmailSender(config as never);
  await expect(sender.send("recipient@example.invalid","a".repeat(43),"SETUP","synthetic-challenge")).resolves.toBe("synthetic-provider-id");
  expect(fetcher).toHaveBeenCalledTimes(1);const payload=JSON.parse(fetcher.mock.calls[0][1]!.body as string);
  expect(payload.to).toEqual(["recipient@example.invalid"]);expect(payload.text).toContain('/governance-password#'+"a".repeat(43));expect(payload.text).not.toContain('?token=');
 });
 it("does not retry an ambiguous provider outcome",async()=>{
  const fetcher=jest.spyOn(global,"fetch").mockRejectedValue(new Error("synthetic transport detail"));
  const config={get:(key:string)=>({RESEND_API_KEY:"synthetic-not-a-real-key",RESEND_FROM_EMAIL:"sender@example.invalid",ADMIN_PORTAL_ORIGIN:"https://synthetic-admin.example"})[key as "RESEND_API_KEY"]};
  await expect(new GovernanceEmailSender(config as never).send("recipient@example.invalid","a".repeat(43),"RESET","synthetic-challenge")).rejects.toThrow();expect(fetcher).toHaveBeenCalledTimes(1);
 });
 it("rejects weak passwords and invalid challenge formats before processing",async()=>{
  expect((await validate(plainToInstance(GovernancePasswordDto,{token:"short",newPassword:"weak"}))).length).toBeGreaterThan(0);
  expect((await validate(plainToInstance(GovernancePasswordDto,{token:"a".repeat(43),newPassword:"SyntheticStrongPassword99"}))).length).toBe(0);
 });
 it("bounds anonymous endpoint attempts without trusting caller role headers",async()=>{
  const guard=new GovernanceRequestLimitGuard();const context={switchToHttp:()=>({getRequest:()=>({ip:"127.0.0.1",headers:{role:"SUPER_ADMIN"}})})};
  for(let i=0;i<20;i++)expect(await guard.canActivate(context as never)).toBe(true);
  await expect(guard.canActivate(context as never)).rejects.toThrow();
 });
});
