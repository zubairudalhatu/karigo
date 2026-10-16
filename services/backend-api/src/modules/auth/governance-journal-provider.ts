import { FactoryProvider } from "@nestjs/common";
import { JournalReader, JournalWriter, RESTORE_JOURNAL_READER, RESTORE_JOURNAL_WRITER } from "../account-deletion/journal-contracts";
import { GcsReleaseAudit, ReleaseAudit } from "../account-deletion/restore-release";
import { RESTORE_RELEASE_AUDIT } from "./governance-controls";

export const governanceJournalProvider: FactoryProvider<ReleaseAudit> = {
  provide: RESTORE_RELEASE_AUDIT,
  inject: [{token:RESTORE_JOURNAL_WRITER,optional:true},{token:RESTORE_JOURNAL_READER,optional:true}],
  useFactory: (writer?:JournalWriter,reader?:JournalReader) => {
    if(writer && reader)return new GcsReleaseAudit(writer,reader);
    const unavailable=async()=>{throw new Error("RESTORE_INDEPENDENT_AUDIT_NOT_CONFIGURED");};
    return {append:unavailable,verify:unavailable};
  }
};
