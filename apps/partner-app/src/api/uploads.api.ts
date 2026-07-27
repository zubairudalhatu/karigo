import type { ApiErrorResponse, ApiSuccessResponse, VendorUploadPurpose, VendorUploadResult } from "@karigo/shared-types";
import { KariGoApiError } from "@karigo/shared-types";
import { api, tokenStore } from "./client";

export interface PartnerUploadAsset {
  uri: string;
  name: string;
  mimeType: string;
}

export async function uploadPartnerFile(asset: PartnerUploadAsset, purpose: VendorUploadPurpose) {
  const form = new FormData();
  form.append("purpose", purpose);
  form.append("file", {
    uri: asset.uri,
    name: asset.name,
    type: asset.mimeType
  } as unknown as Blob);

  const token = await tokenStore.getToken();
  const response = await fetch(`${api.baseUrl}/vendors/uploads`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: form
  });
  const payload = (await response.json().catch(() => null)) as ApiSuccessResponse<VendorUploadResult> | ApiErrorResponse | null;

  if (!response.ok || !payload || payload.success === false) {
    const error = payload && payload.success === false ? payload : undefined;
    throw new KariGoApiError(error?.message || `Upload failed with status ${response.status}`, error?.error_code, response.status, error?.details);
  }

  return payload.data;
}
