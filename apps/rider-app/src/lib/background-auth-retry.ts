import { StaleAuthOperationError } from "@karigo/config";
import { BackgroundSessionReadError } from "./background-session";

export const BACKGROUND_AUTH_RETRY_WINDOW_MS = 2_000;
export const BACKGROUND_AUTH_MAX_READS = 3;
export function isTransientSessionRead(error: unknown) { return error instanceof BackgroundSessionReadError; }
export class BackgroundAuthRetryExhaustedError extends Error {
  readonly code = "AUTH_RETRY_EXHAUSTED";
  constructor() { super("Background session retry exhausted"); this.name = "BackgroundAuthRetryExhaustedError"; }
}
// One callback-local budget, never a persistent retry job. A hung native read is
// raced against the same deadline; late read results cannot authorize an upload.
export function createBackgroundAuthRetry(isCurrent: () => boolean, onTransient: () => Promise<void>,
  now = () => Date.now(), sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms))) {
  const deadline = now() + BACKGROUND_AUTH_RETRY_WINDOW_MS;
  let reads = 0;
  async function bounded<T>(fn: () => Promise<T>): Promise<T> {
    const remaining = deadline - now();
    if (remaining <= 0) throw new BackgroundAuthRetryExhaustedError();
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      return await Promise.race([fn(), new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new BackgroundAuthRetryExhaustedError()), remaining);
      })]);
    } finally { if (timer) clearTimeout(timer); }
  }
  return async function resolve<T>(read: () => Promise<T>): Promise<T> {
    while (reads < BACKGROUND_AUTH_MAX_READS) {
      if (!isCurrent()) throw new StaleAuthOperationError();
      if (now() >= deadline) throw new BackgroundAuthRetryExhaustedError();
      ++reads;
      try {
        const result = await bounded(read);
        if (!isCurrent()) throw new StaleAuthOperationError();
        if (now() >= deadline) throw new BackgroundAuthRetryExhaustedError();
        return result;
      } catch (e) {
        if (!isTransientSessionRead(e)) throw e;
        if (!isCurrent()) throw new StaleAuthOperationError();
        await bounded(onTransient);
        if (reads >= BACKGROUND_AUTH_MAX_READS) break;
        await bounded(() => sleep(reads === 1 ? 250 : 750));
      }
    }
    throw new BackgroundAuthRetryExhaustedError();
  };
}
