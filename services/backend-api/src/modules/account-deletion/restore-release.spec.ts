import { JwtService } from "@nestjs/jwt";
import { AUTHORITY_CLASSES, parseAuthorityRoster, RestoreReleaseSession, ReleaseAudit } from "./restore-release";
const ids = [1,2,3,4].map(n => `00000000-0000-4000-8000-${String(n).padStart(12,"0")}`);
const mapping = Object.fromEntries(AUTHORITY_CLASSES.map((k,i) => [k,[ids[i]]]));
const jwt = new JwtService({ secret: "synthetic-local-test-secret-only" });
const token = (i:number) => jwt.sign({sub:ids[i],scope:"restore-governance",cv:0}, {expiresIn:300});
const target = {instanceId:"synthetic",databaseIdentityHash:"a".repeat(64),manifestDigest:"b".repeat(64),coverage:"synthetic"};
function fixture(audit?: ReleaseAudit) {
  let roster = parseAuthorityRoster(JSON.stringify(mapping));
  const append = jest.fn(async (e:any) => ({generation:"123",verifiedDigest:e.digest}));
  const session = new RestoreReleaseSession(target,jwt,{activeAdmin:async()=>true},()=>roster,audit??{append});
  return {session,append,setRoster:(r:typeof roster)=>{roster=r;}};
}
describe("Authenticated restore release authorities",()=>{
 it("fails closed without a mapping or with reused subjects",()=>{
  expect(()=>parseAuthorityRoster(undefined)).toThrow("ROSTER_MISSING");
  expect(()=>parseAuthorityRoster(JSON.stringify({...mapping,EXECUTIVE:[ids[0]]}))).toThrow("MUST_BE_DISTINCT");
 });
 it("does not accept team names or email claims as admin subjects",()=>{
  expect(()=>parseAuthorityRoster(JSON.stringify({...mapping,EXECUTIVE:["executive@example.invalid"]}))).toThrow("INVALID");
 });
 it("requires authenticated ordered stages and independent durable evidence",async()=>{
  const {session,append}=fixture();
  expect(()=>session.assertOperational()).toThrow("QUARANTINED");
  await expect(session.release(token(3))).rejects.toThrow("ORDER");
  await expect(session.replayComplete("forged")).rejects.toThrow();
  await session.replayComplete(token(0));
  await expect(session.replayVerified(token(0))).rejects.toThrow();
  await session.replayVerified(token(1)); await session.technicalApproval(token(1));
  await session.legalApproval(token(2)); await session.executiveApproval(token(3)); await session.release(token(3));
  expect(()=>session.assertOperational()).not.toThrow(); expect(append).toHaveBeenCalledTimes(6);
 });
 it("does not advance when the independent audit acknowledgement is missing",async()=>{
  const {session}=fixture({append:async()=>({generation:"",verifiedDigest:""})});
  await expect(session.replayComplete(token(0))).rejects.toThrow("NOT_DURABLE");
  expect(session.stage).toBe("RESTORED_QUARANTINED");
 });
 it("prevents a subject switching mandatory classes after a mapping change",async()=>{
  const {session,setRoster}=fixture(); await session.replayComplete(token(0));
  await session.replayVerified(token(1)); await session.technicalApproval(token(1));
  setRoster({...parseAuthorityRoster(JSON.stringify(mapping)),LEGAL_COMPLIANCE:[ids[1]]});
  await expect(session.legalApproval(token(1))).rejects.toThrow("MUST_BE_DISTINCT");
 });
 it("rejects inactive admin accounts",async()=>{
  const session=new RestoreReleaseSession(target,jwt,{activeAdmin:async()=>false},()=>parseAuthorityRoster(JSON.stringify(mapping)),{append:jest.fn()});
  await expect(session.replayComplete(token(0))).rejects.toThrow("DENIED");
 });
});
