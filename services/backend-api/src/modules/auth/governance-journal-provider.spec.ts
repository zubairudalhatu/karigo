import { Test } from "@nestjs/testing";
import { governanceJournalProvider } from "./governance-journal-provider";
import { RESTORE_RELEASE_AUDIT } from "./governance-controls";
import { JournalReader, JournalWriter, RESTORE_JOURNAL_READER, RESTORE_JOURNAL_WRITER } from "../account-deletion/journal-contracts";
import { ReleaseAudit, ReleaseEvent } from "../account-deletion/restore-release";
import { retentionExpiry } from "../account-deletion/retention-policy";
describe("Production approval audit dependency composition (synthetic storage only)",()=>{
 it("fails closed with no clients or only one scoped client",async()=>{
  for(const providers of [[],[{provide:RESTORE_JOURNAL_WRITER,useValue:{create:jest.fn()}}]]) {
   const m=await Test.createTestingModule({providers:[governanceJournalProvider,...providers]}).compile();
   await expect(m.get<ReleaseAudit>(RESTORE_RELEASE_AUDIT).append({} as ReleaseEvent)).rejects.toThrow("NOT_CONFIGURED");await m.close();
  }
 });
 it("uses separate writer/readback clients and never republishes missing history",async()=>{
  const objects=new Map<string,{body:string;retainUntil:string}>();
  const writer:JournalWriter={create:jest.fn(async(name,body,retainUntil)=>{if(objects.has(name))return {status:412};objects.set(name,{body,retainUntil});return {status:200,generation:"123"};})};
  const reader:JournalReader={read:jest.fn(async name=>{const o=objects.get(name);if(!o)throw new Error("SYNTHETIC_NOT_FOUND");return {...o,generation:"123",retentionMode:"Unlocked"};})};
  const m=await Test.createTestingModule({providers:[governanceJournalProvider,{provide:RESTORE_JOURNAL_WRITER,useValue:writer},{provide:RESTORE_JOURNAL_READER,useValue:reader}]}).compile();
  const audit=m.get<ReleaseAudit>(RESTORE_RELEASE_AUDIT);
  const event:ReleaseEvent={target:{instanceId:"synthetic",databaseIdentityHash:"a".repeat(64),manifestDigest:"b".repeat(64),coverage:"synthetic"},from:"RESTORED_QUARANTINED",to:"JOURNAL_REPLAY_COMPLETE",subject:"00000000-0000-4000-8000-000000000001",authority:"REPLAY_OPERATOR",at:"2024-02-29T12:00:00.000Z",previousDigest:"0".repeat(64),digest:"c".repeat(64)};
  await expect(audit.append(event)).resolves.toEqual({generation:"123",verifiedDigest:event.digest});
  expect(writer.create).toHaveBeenCalledWith(`checkpoints/v1/release-${event.digest}.json`,expect.any(String),retentionExpiry("DELETION_AUDIT",new Date(event.at)).toISOString());
  await audit.append(event);await audit.verify!(event);objects.clear();const count=(writer.create as jest.Mock).mock.calls.length;
  await expect(audit.verify!(event)).rejects.toThrow("NOT_FOUND");expect(writer.create).toHaveBeenCalledTimes(count);await m.close();
 });
});
