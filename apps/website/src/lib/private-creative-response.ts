const CREATIVE_MEDIA_TYPES = new Set(["image/png", "image/jpeg"]);
const MAX_CREATIVE_BYTES = 5 * 1024 * 1024;

export type PrivateCreativeResponse =
  | { kind: "binary"; body: BodyInit | null; headers: Headers; status: number }
  | { kind: "wrapped-json" }
  | { kind: "rejected" };

function mediaType(contentType: string | null) {
  return (contentType ?? "").split(";", 1)[0].trim().toLowerCase();
}

function binaryHeaders(type: string, length?: number) {
  const headers = new Headers({
    "Cache-Control": "private, no-store",
    "Content-Type": type,
    "X-Content-Type-Options": "nosniff"
  });
  if (length !== undefined) headers.set("Content-Length", String(length));
  return headers;
}

export function preparePrivateCreativeResponse(upstream: Response): PrivateCreativeResponse {
  const type = mediaType(upstream.headers.get("content-type"));
  if (type === "application/json") return { kind: "wrapped-json" };
  if (!CREATIVE_MEDIA_TYPES.has(type)) return { kind: "rejected" };

  const headers = binaryHeaders(type);
  for (const name of ["content-length", "etag", "last-modified"]) {
    const value = upstream.headers.get(name);
    if (value) headers.set(name, value);
  }
  return { kind: "binary", body: upstream.body, headers, status: upstream.status };
}

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function bufferChunk(value: unknown): Uint8Array | null {
  const chunk = record(value);
  if (!chunk || chunk.type !== "Buffer" || !Array.isArray(chunk.data)) return null;
  if (!chunk.data.every((byte) => Number.isInteger(byte) && Number(byte) >= 0 && Number(byte) <= 255)) return null;
  return Uint8Array.from(chunk.data as number[]);
}

export async function decodeWrappedPrivateCreative(upstream: Response): Promise<PrivateCreativeResponse> {
  const payload = record(await upstream.json().catch(() => null));
  const data = record(payload?.data);
  const options = record(data?.options);
  const stream = record(data?.stream);
  const state = record(stream?._readableState);
  const type = mediaType(typeof options?.type === "string" ? options.type : null);
  const declaredLength = options?.length;
  const chunks = state?.buffer;

  if (
    payload?.success !== true ||
    !CREATIVE_MEDIA_TYPES.has(type) ||
    !Number.isInteger(declaredLength) ||
    Number(declaredLength) < 1 ||
    Number(declaredLength) > MAX_CREATIVE_BYTES ||
    state?.length !== declaredLength ||
    !Array.isArray(chunks)
  ) return { kind: "rejected" };

  const decoded = chunks.map(bufferChunk);
  if (decoded.some((chunk) => chunk === null)) return { kind: "rejected" };
  const bytes = new Uint8Array(Number(declaredLength));
  let offset = 0;
  for (const chunk of decoded as Uint8Array[]) {
    if (offset + chunk.byteLength > bytes.byteLength) return { kind: "rejected" };
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  if (offset !== bytes.byteLength) return { kind: "rejected" };

  return { kind: "binary", body: bytes, headers: binaryHeaders(type, bytes.byteLength), status: upstream.status };
}
