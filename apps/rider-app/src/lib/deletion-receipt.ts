import * as SecureStore from "expo-secure-store";
import { API_BASE_URL } from "../api/client";
import type { AccountDeletionRequest } from "../api/account-deletion.api";

const KEY = "karigo_captain_deletion_receipt_v1";
export type SavedDeletionReceipt = { userId: string; receiptToken: string; requestReference?: string; accountType?: "CAPTAIN" | "COMPLETE_ACCOUNT" };
export async function saveDeletionReceipt(receipt: SavedDeletionReceipt) {
  await SecureStore.setItemAsync(KEY, JSON.stringify(receipt));
}
export async function readDeletionReceipt(): Promise<SavedDeletionReceipt | null> {
  try {
    const raw = await SecureStore.getItemAsync(KEY);
    if (!raw) return null;
    const value = JSON.parse(raw);
    return typeof value.userId === "string" && /^[A-Za-z0-9_-]{43}$/.test(value.receiptToken) ? value : null;
  } catch { return null; }
}
export async function loadDeletionReceipt(receipt: SavedDeletionReceipt): Promise<AccountDeletionRequest> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  try {
    const response = await fetch(`${API_BASE_URL}/account-deletion/captain-receipt`, {
      headers: { "x-deletion-receipt": receipt.receiptToken }, signal: controller.signal
    });
    if (!response.ok) throw new Error("Deletion status is temporarily unavailable. Please try again.");
    return (await response.json()).data;
  } finally { clearTimeout(timeout); }
}
