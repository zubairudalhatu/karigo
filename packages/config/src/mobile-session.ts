import {
  SessionCorruptionError,
  SessionPersistenceError,
  StaleAuthOperationError,
  TokenStore
} from "./api";

export interface SecureKeyValueStorage {
  getItemAsync(key: string): Promise<string | null>;
  setItemAsync(key: string, value: string): Promise<void>;
  deleteItemAsync(key: string): Promise<void>;
}

export interface AuthSessionEnvelopeV2 {
  schemaVersion: 2;
  accessToken: string;
  refreshToken: string;
  savedAt: string;
  sessionGeneration: number;
}

export interface AuthSessionStoreOptions {
  appName: string;
  storage: SecureKeyValueStorage;
  sessionKey: string;
  legacyAccessTokenKey: string;
  legacyRefreshTokenKey: string;
}

export interface AuthSessionStores {
  tokenStore: TokenStore;
  refreshTokenStore: TokenStore;
}

export interface VersionedAuthSessionStore extends AuthSessionStores {
  readonly sessionKey: string;
  currentGeneration(): number;
  beginOperation(): number;
  beginNewSession(): number;
  isCurrent(generation?: number): boolean;
  readSession(): Promise<AuthSessionEnvelopeV2 | null>;
  persistTokenPair(accessToken: string, refreshToken: string, generation?: number): Promise<AuthSessionEnvelopeV2>;
  clearSession(generation?: number): Promise<void>;
  resetSavedLogin(): Promise<void>;
}

function isAuthSessionEnvelope(value: unknown): value is AuthSessionEnvelopeV2 {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<AuthSessionEnvelopeV2>;
  return candidate.schemaVersion === 2 &&
    typeof candidate.accessToken === "string" &&
    candidate.accessToken.trim().length > 0 &&
    typeof candidate.refreshToken === "string" &&
    candidate.refreshToken.trim().length > 0 &&
    typeof candidate.savedAt === "string" &&
    typeof candidate.sessionGeneration === "number" &&
    Number.isFinite(candidate.sessionGeneration);
}

function createEnvelope(accessToken: string, refreshToken: string, sessionGeneration: number): AuthSessionEnvelopeV2 {
  return {
    schemaVersion: 2,
    accessToken,
    refreshToken,
    savedAt: new Date().toISOString(),
    sessionGeneration
  };
}

export function createVersionedAuthSessionStore(options: AuthSessionStoreOptions): VersionedAuthSessionStore {
  let generation = 0;

  function currentGeneration(): number {
    return generation;
  }

  function beginOperation(): number {
    return generation;
  }

  function beginNewSession(): number {
    generation += 1;
    return generation;
  }

  function isCurrent(operationGeneration?: number): boolean {
    return operationGeneration === undefined || operationGeneration === generation;
  }

  async function deleteLegacyKeys(): Promise<void> {
    await Promise.all([
      options.storage.deleteItemAsync(options.legacyAccessTokenKey),
      options.storage.deleteItemAsync(options.legacyRefreshTokenKey)
    ]);
  }

  async function deleteAllAuthKeys(): Promise<void> {
    await Promise.all([
      options.storage.deleteItemAsync(options.sessionKey),
      options.storage.deleteItemAsync(options.legacyAccessTokenKey),
      options.storage.deleteItemAsync(options.legacyRefreshTokenKey)
    ]);
  }

  async function writeEnvelope(envelope: AuthSessionEnvelopeV2): Promise<void> {
    try {
      await options.storage.setItemAsync(options.sessionKey, JSON.stringify(envelope));
    } catch {
      throw new SessionPersistenceError(`${options.appName} could not save your login securely on this device.`);
    }
  }

  async function persistTokenPair(
    accessToken: string,
    refreshToken: string,
    operationGeneration = generation
  ): Promise<AuthSessionEnvelopeV2> {
    if (!isCurrent(operationGeneration)) {
      throw new StaleAuthOperationError();
    }
    if (!accessToken?.trim() || !refreshToken?.trim()) {
      throw new SessionPersistenceError(`${options.appName} received an incomplete login session.`);
    }

    const envelope = createEnvelope(accessToken, refreshToken, operationGeneration);
    await writeEnvelope(envelope);
    await deleteLegacyKeys().catch(() => undefined);
    return envelope;
  }

  async function readStoredEnvelope(): Promise<AuthSessionEnvelopeV2 | null> {
    const rawEnvelope = await options.storage.getItemAsync(options.sessionKey);
    if (!rawEnvelope) {
      return null;
    }

    try {
      const parsed = JSON.parse(rawEnvelope) as unknown;
      if (!isAuthSessionEnvelope(parsed)) {
        throw new Error("Invalid session envelope");
      }
      return parsed;
    } catch {
      throw new SessionCorruptionError(`${options.appName} saved login needs to be reset before continuing.`);
    }
  }

  async function migrateLegacySession(): Promise<AuthSessionEnvelopeV2 | null> {
    const [legacyAccessToken, legacyRefreshToken] = await Promise.all([
      options.storage.getItemAsync(options.legacyAccessTokenKey),
      options.storage.getItemAsync(options.legacyRefreshTokenKey)
    ]);

    if (!legacyAccessToken && !legacyRefreshToken) {
      return null;
    }
    if (!legacyAccessToken || !legacyRefreshToken) {
      throw new SessionCorruptionError(`${options.appName} saved login is incomplete and needs to be reset.`);
    }

    const envelope = createEnvelope(legacyAccessToken, legacyRefreshToken, generation);
    await writeEnvelope(envelope);
    await deleteLegacyKeys().catch(() => undefined);
    return envelope;
  }

  async function readSession(): Promise<AuthSessionEnvelopeV2 | null> {
    const envelope = await readStoredEnvelope();
    if (envelope) {
      return envelope;
    }
    return migrateLegacySession();
  }

  async function clearSession(operationGeneration = generation): Promise<void> {
    if (!isCurrent(operationGeneration)) {
      return;
    }
    await deleteAllAuthKeys();
  }

  async function resetSavedLogin(): Promise<void> {
    beginNewSession();
    await deleteAllAuthKeys();
  }

  const tokenStore: TokenStore = {
    getToken: async () => {
      const session = await readSession();
      return session?.accessToken ?? null;
    },
    setToken: async (token: string) => {
      const session = await readSession();
      if (!session?.refreshToken) {
        throw new SessionPersistenceError(`${options.appName} could not update the saved access token.`);
      }
      await persistTokenPair(token, session.refreshToken);
    },
    clearToken: clearSession
  };

  const refreshTokenStore: TokenStore = {
    getToken: async () => {
      const session = await readSession();
      return session?.refreshToken ?? null;
    },
    setToken: async (token: string) => {
      const session = await readSession();
      if (!session?.accessToken) {
        throw new SessionPersistenceError(`${options.appName} could not update the saved refresh token.`);
      }
      await persistTokenPair(session.accessToken, token);
    },
    clearToken: clearSession
  };

  return {
    sessionKey: options.sessionKey,
    currentGeneration,
    beginOperation,
    beginNewSession,
    isCurrent,
    readSession,
    persistTokenPair,
    clearSession,
    resetSavedLogin,
    tokenStore,
    refreshTokenStore
  };
}
