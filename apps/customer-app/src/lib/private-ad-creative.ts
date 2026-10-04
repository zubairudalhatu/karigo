const CREATIVE_PATH = /^\/ads\/creative\/([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/i;
const ALLOWED_MEDIA_TYPES = new Set(["image/png", "image/jpeg"]);
const MAX_CREATIVE_BYTES = 5 * 1024 * 1024;
const BASE64_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

type WrappedCreative = {
  success?: unknown;
  data?: {
    options?: { type?: unknown; length?: unknown };
    stream?: { _readableState?: { length?: unknown; buffer?: unknown } };
  };
};

function normalizedMediaType(value: string | null) {
  return (value ?? "").split(";", 1)[0].trim().toLowerCase();
}

function approvedCreativeUrl(source: string, apiBaseUrl: string): string | null {
  try {
    const base = new URL(`${apiBaseUrl.replace(/\/+$/, "")}/`);
    const candidate = source.startsWith("/")
      ? new URL(`${apiBaseUrl.replace(/\/+$/, "")}${source}`)
      : new URL(source, base);
    const basePath = base.pathname.replace(/\/$/, "");
    const relativePath = candidate.pathname.startsWith(basePath)
      ? candidate.pathname.slice(basePath.length)
      : "";

    if (
      candidate.origin !== base.origin ||
      candidate.search ||
      candidate.hash ||
      !CREATIVE_PATH.test(relativePath)
    ) return null;

    return candidate.toString();
  } catch {
    return null;
  }
}

function decodeChunk(value: unknown): Uint8Array | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const chunk = value as { type?: unknown; data?: unknown };
  if (chunk.type !== "Buffer" || !Array.isArray(chunk.data)) return null;
  if (!chunk.data.every((byte) => Number.isInteger(byte) && Number(byte) >= 0 && Number(byte) <= 255)) return null;
  return Uint8Array.from(chunk.data as number[]);
}

function decodeWrappedCreative(payload: WrappedCreative): { mediaType: string; bytes: Uint8Array } | null {
  const options = payload.data?.options;
  const state = payload.data?.stream?._readableState;
  const mediaType = normalizedMediaType(typeof options?.type === "string" ? options.type : null);
  const declaredLength = options?.length;
  const chunks = state?.buffer;

  if (
    payload.success !== true ||
    !ALLOWED_MEDIA_TYPES.has(mediaType) ||
    !Number.isInteger(declaredLength) ||
    Number(declaredLength) < 1 ||
    Number(declaredLength) > MAX_CREATIVE_BYTES ||
    state?.length !== declaredLength ||
    !Array.isArray(chunks)
  ) return null;

  const decoded = chunks.map(decodeChunk);
  if (decoded.some((chunk) => chunk === null)) return null;

  const bytes = new Uint8Array(Number(declaredLength));
  let offset = 0;
  for (const chunk of decoded as Uint8Array[]) {
    if (offset + chunk.byteLength > bytes.byteLength) return null;
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return offset === bytes.byteLength ? { mediaType, bytes } : null;
}

function hasExpectedSignature(mediaType: string, bytes: Uint8Array) {
  if (mediaType === "image/png") {
    const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
    return bytes.length >= signature.length && signature.every((byte, index) => bytes[index] === byte);
  }
  return mediaType === "image/jpeg" && bytes.length >= 4 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
}

function bytesToBase64(bytes: Uint8Array) {
  const parts: string[] = [];
  let part = "";
  for (let index = 0; index < bytes.length; index += 3) {
    const first = bytes[index];
    const second = index + 1 < bytes.length ? bytes[index + 1] : 0;
    const third = index + 2 < bytes.length ? bytes[index + 2] : 0;
    const combined = (first << 16) | (second << 8) | third;
    part += BASE64_ALPHABET[(combined >> 18) & 63];
    part += BASE64_ALPHABET[(combined >> 12) & 63];
    part += index + 1 < bytes.length ? BASE64_ALPHABET[(combined >> 6) & 63] : "=";
    part += index + 2 < bytes.length ? BASE64_ALPHABET[combined & 63] : "=";
    if (part.length >= 16_384) {
      parts.push(part);
      part = "";
    }
  }
  if (part) parts.push(part);
  return parts.join("");
}

export async function loadPrivateAdCreative(
  source: string,
  apiBaseUrl: string,
  accessToken: string | null,
  fetcher: typeof fetch = fetch
): Promise<string | null> {
  const url = approvedCreativeUrl(source, apiBaseUrl);
  if (!url || !accessToken) return null;

  const response = await fetcher(url, {
    method: "GET",
    headers: {
      Accept: "image/png, image/jpeg",
      Authorization: `Bearer ${accessToken}`
    }
  });
  if (!response.ok || response.status !== 200) return null;

  let decoded: { mediaType: string; bytes: Uint8Array } | null = null;
  const mediaType = normalizedMediaType(response.headers.get("content-type"));
  if (ALLOWED_MEDIA_TYPES.has(mediaType)) {
    const declaredLength = Number(response.headers.get("content-length"));
    if (Number.isFinite(declaredLength) && declaredLength > MAX_CREATIVE_BYTES) return null;
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.byteLength < 1 || bytes.byteLength > MAX_CREATIVE_BYTES) return null;
    decoded = { mediaType, bytes };
  } else if (mediaType === "application/json") {
    decoded = decodeWrappedCreative(await response.json().catch(() => null) as WrappedCreative);
  }

  if (!decoded || !hasExpectedSignature(decoded.mediaType, decoded.bytes)) return null;
  return `data:${decoded.mediaType};base64,${bytesToBase64(decoded.bytes)}`;
}

export const privateAdCreativePolicy = {
  allowedMediaTypes: ["image/png", "image/jpeg"] as const,
  maxBytes: MAX_CREATIVE_BYTES
};
