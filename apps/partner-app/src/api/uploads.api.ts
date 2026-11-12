import type { ApiErrorResponse, ApiSuccessResponse, VendorUploadPurpose, VendorUploadResult } from "@karigo/shared-types";
import { KariGoApiError } from "@karigo/shared-types";
import * as FileSystem from "expo-file-system";
import { api, authSessionStore, refreshAuth, tokenStore } from "./client";

export interface PartnerUploadAsset { uri: string; name: string; mimeType: string; }

export async function uploadPartnerFile(asset: PartnerUploadAsset, purpose: VendorUploadPurpose): Promise<VendorUploadResult> {
  const generation = authSessionStore.currentGeneration();
  const privateDocument = purpose === "onboarding-document";
  const path = privateDocument ? "partner-mobile/onboarding/files" : "vendors/uploads";
  try {
    for (let attempt = 0; attempt < 2; attempt++) {
      if (!authSessionStore.isCurrent(generation)) throw new Error("Sign in again before uploading.");
      const token = await tokenStore.getToken();
      if (!authSessionStore.isCurrent(generation)) throw new Error("Upload session changed.");
      if (!token) throw new Error("Sign in before uploading.");
      const form = new FormData();
      form.append("purpose", purpose);
      form.append("file", { uri: asset.uri, name: asset.name, type: asset.mimeType } as unknown as Blob);
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 30_000);
      try {
        const response = await fetch(`${api.baseUrl}/${path}`, { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: form, signal: controller.signal });
        if (response.status === 401 && attempt === 0) {
          const refreshed = await refreshAuth({ generation });
          if (refreshed === true || refreshed === "refreshed") continue;
        }
        const payload = await response.json().catch(() => null) as ApiSuccessResponse<VendorUploadResult> | ApiErrorResponse | null;
        if (!response.ok || !payload || payload.success === false) {
          throw new KariGoApiError("Partner upload could not be completed.", undefined, response.status);
        }
        if (!authSessionStore.isCurrent(generation)) throw new Error("The upload session changed. Sign in again.");
        return { ...payload.data, purpose, originalName: asset.name, relativeUrl: payload.data.relativeUrl ?? payload.data.url };
      } finally { clearTimeout(timer); }
    }
    throw new Error("Sign in again before uploading.");
  } finally {
    // Remove only picker-created cache copies, never an original selected file.
    const cache = FileSystem.cacheDirectory;
    if (cache && asset.uri.startsWith(cache)) await FileSystem.deleteAsync(asset.uri, { idempotent: true }).catch(() => undefined);
  }
}
