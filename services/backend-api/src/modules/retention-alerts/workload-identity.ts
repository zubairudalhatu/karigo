import { createPublicKey, verify } from "node:crypto";

type Jwk = { kid: string; kty: string; n?: string; e?: string };
export class GoogleWorkloadIdentity {
  private keys: Jwk[] = [];
  private expires = 0;
  constructor(private readonly fetcher: typeof fetch = fetch) {}
  async authenticate(token: string, audience: string, email: string, subject: string, now = Date.now()) {
    try {
      if (!audience || !email || !/^\d+$/.test(subject) || token.length > 8192) throw new Error();
      const parts = token.split(".");
      if (parts.length !== 3) throw new Error();
      const header = JSON.parse(Buffer.from(parts[0], "base64url").toString());
      const c = JSON.parse(Buffer.from(parts[1], "base64url").toString());
      if (header.alg !== "RS256" || typeof header.kid !== "string") throw new Error();
      if (now >= this.expires) {
        const r = await this.fetcher("https://www.googleapis.com/oauth2/v3/certs", { signal: AbortSignal.timeout(10_000), redirect: "error" });
        if (!r.ok) throw new Error();
        const data = await r.json() as { keys: Jwk[] };
        if (!Array.isArray(data.keys)) throw new Error();
        this.keys = data.keys; this.expires = now + 300_000;
      }
      const jwk = this.keys.find(k => k.kid === header.kid && k.kty === "RSA");
      if (!jwk || !verify("RSA-SHA256", Buffer.from(`${parts[0]}.${parts[1]}`), createPublicKey({ key: jwk, format: "jwk" }), Buffer.from(parts[2], "base64url"))) throw new Error();
      if (!["https://accounts.google.com", "accounts.google.com"].includes(c.iss) || c.aud !== audience
        || c.email !== email || c.email_verified !== true || c.sub !== subject
        || typeof c.exp !== "number" || typeof c.iat !== "number" || c.exp * 1000 <= now
        || c.iat * 1000 > now + 30_000 || c.iat * 1000 < now - 3_600_000 || c.exp - c.iat > 3700) throw new Error();
      return true;
    } catch { throw new Error("WORKLOAD_AUTH_FAILED"); }
  }
}
