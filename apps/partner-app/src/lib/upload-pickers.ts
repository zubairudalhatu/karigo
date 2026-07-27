import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import type { VendorUploadPurpose } from "@karigo/shared-types";
import { uploadPartnerFile } from "../api/uploads.api";

function filenameFromUri(uri: string, fallback: string) {
  const clean = uri.split("?")[0] ?? uri;
  return clean.split("/").filter(Boolean).pop() || fallback;
}

export async function pickAndUploadImage(purpose: Extract<VendorUploadPurpose, "product-image" | "service-image" | "logo" | "cover">) {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    throw new Error("Please allow photo access to upload this image.");
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    quality: 0.7
  });

  if (result.canceled) return null;
  const asset = result.assets[0];
  if (!asset?.uri) throw new Error("Unable to read the selected image. Please try another image.");

  return uploadPartnerFile({
    uri: asset.uri,
    name: asset.fileName || filenameFromUri(asset.uri, `${purpose}.jpg`),
    mimeType: asset.mimeType || "image/jpeg"
  }, purpose);
}

export async function pickAndUploadDocument() {
  const result = await DocumentPicker.getDocumentAsync({
    type: ["application/pdf", "image/jpeg", "image/png", "image/webp"],
    copyToCacheDirectory: true,
    multiple: false
  });

  if (result.canceled) return null;
  const asset = result.assets[0];
  if (!asset?.uri) throw new Error("Unable to read the selected document. Please try another file.");

  return uploadPartnerFile({
    uri: asset.uri,
    name: asset.name || filenameFromUri(asset.uri, "partner-document"),
    mimeType: asset.mimeType || "application/octet-stream"
  }, "onboarding-document");
}
