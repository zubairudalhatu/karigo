const CREATIVE_PATH = /^ads\/creative\/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const CREATIVE_MEDIA_TYPES = new Set(["image/png", "image/jpeg"]);

export type CreativeBinaryResponse =
  | { kind: "not-binary" }
  | { kind: "rejected"; mediaType: string }
  | {
      kind: "binary";
      body: ReadableStream<Uint8Array> | null;
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
