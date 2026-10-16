// Shared storage contract only. Importing auth/approval controls must never
// start the deletion publisher, retention worker or checkpoint scheduler.
export interface JournalWriter { create(name: string, body: string, retainUntil: string): Promise<{ status: number; generation?: string }> }
export interface JournalReader { read(name: string, generation?: string): Promise<{ body: string; generation: string; retainUntil: string; retentionMode: string }> }
// Runtime composition supplies separately authenticated, scoped keyless clients.
// These are dependency references, never credential strings or public endpoints.
export const RESTORE_JOURNAL_WRITER = Symbol.for("karigo.restore.journal.writer");
export const RESTORE_JOURNAL_READER = Symbol.for("karigo.restore.journal.reader");
