import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { handleBffRequest } from "../../../../src/lib/bff-session";
import { isCreativeAssetId } from "../../../../src/lib/ad-creative-path";

type RouteContext = {
  params: Promise<{ assetId: string }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  const { assetId } = await context.params;
  if (!isCreativeAssetId(assetId)) {
    return NextResponse.json({ success: false, message: "Creative asset was not found.", error_code: "CREATIVE_ASSET_NOT_FOUND" }, { status: 404 });
  }
  return handleBffRequest(request, ["ads", "creative", assetId]);
}
