import { KariGoApiError } from "@karigo/shared-types";
import { api, tokenStore } from "./client";

export type CaptainDocumentType =
  | "PROFILE_PHOTO"
  | "DRIVER_LICENCE"
  | "VEHICLE_EXTERIOR"
  | "VEHICLE_INTERIOR"
  | "VEHICLE_LICENCE"
  | "INSURANCE"
  | "ROADWORTHINESS"
  | "GUARANTOR_ID";

export interface CaptainUploadedDocument {
  id: string;
  documentType: CaptainDocumentType;
  originalFileName: string;
  mimeType: string;
  sizeBytes: number;
  uploadStatus: "UPLOADED" | "REPLACED" | "DELETED";
  reviewStatus: string;
  uploadedAt: string;
}

export interface LocalUploadAsset {
  uri: string;
  name?: string | null;
  mimeType?: string | null;
}

type ApiPayload<T> = {
  success?: boolean;
  message?: string;
  data?: T;
  error_code?: string;
  details?: unknown;
};

export const captainDocumentsApi = {
  upload: async (documentType: CaptainDocumentType, asset: LocalUploadAsset) => {
    const token = await tokenStore.getToken();
    if (!token) throw new Error("Sign in before uploading Captain documents.");
    const form = new FormData();
    form.append("documentType", documentType);
    form.append("file", {
      uri: asset.uri,
      name: asset.name || `${documentType.toLowerCase()}.jpg`,
      type: asset.mimeType || "image/jpeg"
    } as unknown as Blob);
    const response = await fetch(`${api.baseUrl}/captain/application-documents/uploads`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`
      },
      body: form
    });
    const payload = (await response.json().catch(() => null)) as ApiPayload<CaptainUploadedDocument> | null;
    if (!response.ok || !payload?.data || payload.success === false) {
      throw new KariGoApiError(payload?.message || "Captain document upload failed.", payload?.error_code, response.status, payload?.details);
    }
    return payload.data;
  },
  remove: (documentId: string) => api.delete<CaptainUploadedDocument>(`captain/application-documents/${documentId}`)
};
