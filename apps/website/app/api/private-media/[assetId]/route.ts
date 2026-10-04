import { normalizeApiBaseUrl } from "@karigo/config";
import { NextRequest, NextResponse } from "next/server";
import { isCreativeAssetId } from "../../../../src/lib/private-creative-path";
import { decodeWrappedPrivateCreative, preparePrivateCreativeResponse } from "../../../../src/lib/private-creative-response";

function safeError(message: string, status: number) {
  return NextResponse.json({ success: false, message }, { status });
}

export async function GET(request: NextRequest, context: { params: Promise<{ assetId: string }> }) {
  const { assetId } = await context.params;
  if (!isCreativeAssetId(assetId)) return safeError("Creative not found.", 404);

  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) return safeError("Authentication is required.", 401);

  const baseUrl = normalizeApiBaseUrl(process.env.API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL);
  let upstream: Response;
  try {
    upstream = await fetch(`${baseUrl}/ads/creative/${assetId}`, {
      method: "GET",
      headers: { Accept: "image/png, image/jpeg", Authorization: authorization },
      cache: "no-store"
    });
  } catch {
    return safeError("KariGO services are temporarily unavailable.", 503);
  }

  if (!upstream.ok) {
    const status = [401, 403, 404].includes(upstream.status) ? upstream.status : 502;
    return safeError(status === 404 ? "Creative not found." : "Creative could not be retrieved safely.", status);
  }

  let prepared = preparePrivateCreativeResponse(upstream);
  if (prepared.kind === "wrapped-json") prepared = await decodeWrappedPrivateCreative(upstream);
  if (prepared.kind !== "binary") return safeError("Creative response type is not allowed.", 415);
  return new NextResponse(prepared.body, { status: prepared.status, headers: prepared.headers });
}
