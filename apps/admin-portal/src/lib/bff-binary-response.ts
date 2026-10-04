const CREATIVE_PATH = /^ads\/creative\/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const CREATIVE_MEDIA_TYPES = new Set(["image/png", "image/jpeg"]);
const MAX_CREATIVE_BYTES = 5 * 1024 * 1024;

export type CreativeBinaryResponse =
  | { kind: "not-binary" }
  | { kind: "wrapped-json" }
  | { kind: "rejected"; mediaType: string }
  | {
      kind: "binary";
      body: BodyInit | null;
      headers: Headers;
      status: number;
    };

export function isCreativeBinaryRequest(path: string, method: string) {
  return method === "GET" && CREATIVE_PATH.test(path);
}

export function normalizedMediaType(contentType: string | null) {
  return (contentType ?? "").split(";", 1)[0].trim().toLowerCase();
}

export function prepareCreativeBinaryResponse(path: string, method: string, upstream: Response): CreativeBinaryResponse {
  if (!isCreativeBinaryRequest(path, method) || !upstream.ok) return { kind: "not-binary" };

  const mediaType = normalizedMediaType(upstream.headers.get("content-type"));
  if (mediaType === "application/json") return { kind: "wrapped-json" };
  if (!CREATIVE_MEDIA_TYPES.has(mediaType)) return { kind: "rejected", mediaType };

  const headers = new Headers({
    "Cache-Control": "private, no-store",
    "Content-Type": mediaType,
    "X-Content-Type-Options": "nosniff"
  });
  for (const name of ["content-length", "etag", "last-modified"]) {
    const value = upstream.headers.get(name);
    if (value) headers.set(name, value);
  }

  return {
    kind: "binary",
    body: upstream.body,
    headers,
    status: upstream.status
  };
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function decodeBufferChunk(value: unknown): Uint8Array | null {
  if (!isPlainRecord(value) || value.type !== "Buffer" || !Array.isArray(value.data)) return null;
  if (!value.data.every((byte) => Number.isInteger(byte) && Number(byte) >= 0 && Number(byte) <= 255)) return null;
  return Uint8Array.from(value.data as number[]);
}

export async function decodeWrappedCreativeResponse(upstream: Response): Promise<CreativeBinaryResponse> {
  const payload = await upstream.json().catch(() => null) as unknown;
  if (!isPlainRecord(payload) || payload.success !== true || !isPlainRecord(payload.data)) {
    return { kind: "rejected", mediaType: "application/json" };
  }

  const options = payload.data.options;
  const stream = payload.data.stream;
  if (!isPlainRecord(options) || !isPlainRecord(stream) || !isPlainRecord(stream._readableState)) {
    return { kind: "rejected", mediaType: "application/json" };
  }

  const mediaType = normalizedMediaType(typeof options.type === "string" ? options.type : null);
  const declaredLength = options.length;
  const readableLength = stream._readableState.length;
  const chunks = stream._readableState.buffer;
  if (
    !CREATIVE_MEDIA_TYPES.has(mediaType) ||
    !Number.isInteger(declaredLength) ||
    Number(declaredLength) < 1 ||
    Number(declaredLength) > MAX_CREATIVE_BYTES ||
    readableLength !== declaredLength ||
    !Array.isArray(chunks)
  ) {
    return { kind: "rejected", mediaType };
  }

  const decodedChunks = chunks.map(decodeBufferChunk);
  if (decodedChunks.some((chunk) => chunk === null)) return { kind: "rejected", mediaType };
  const bytes = new Uint8Array(Number(declaredLength));
  let offset = 0;
  for (const chunk of decodedChunks as Uint8Array[]) {
    if (offset + chunk.byteLength > bytes.byteLength) return { kind: "rejected", mediaType };
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  if (offset !== bytes.byteLength) return { kind: "rejected", mediaType };

  return {
    kind: "binary",
    body: bytes,
    headers: new Headers({
      "Cache-Control": "private, no-store",
      "Content-Length": String(bytes.byteLength),
      "Content-Type": mediaType,
      "X-Content-Type-Options": "nosniff"
    }),
    status: upstream.status
  };
}
