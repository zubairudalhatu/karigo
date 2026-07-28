import type { NextRequest } from "next/server";
import { handleBffRequest } from "../../../../src/lib/bff-session";

type RouteContext = {
  params: Promise<{ path?: string[] }>;
};

async function handle(request: NextRequest, context: RouteContext) {
  const params = await context.params;
  return handleBffRequest(request, params.path ?? []);
}

export const GET = handle;
export const POST = handle;
export const PATCH = handle;
export const PUT = handle;
export const DELETE = handle;
