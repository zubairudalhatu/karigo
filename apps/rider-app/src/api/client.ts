import { createApiClient, TokenStore } from "@karigo/config";
import * as SecureStore from "expo-secure-store";

const TOKEN_KEY = "karigo_rider_access_token";

export const tokenStore: TokenStore = {
  getToken: () => SecureStore.getItemAsync(TOKEN_KEY),
  setToken: (token) => SecureStore.setItemAsync(TOKEN_KEY, token),
  clearToken: () => SecureStore.deleteItemAsync(TOKEN_KEY)
};

const unauthorizedListeners = new Set<() => void>();
export function onUnauthorized(listener: () => void) {
  unauthorizedListeners.add(listener);
  return () => { unauthorizedListeners.delete(listener); };
}

export const api = createApiClient({
  baseUrl: process.env.EXPO_PUBLIC_API_BASE_URL,
  tokenStore,
  onUnauthorized: async () => {
    await tokenStore.clearToken?.();
    unauthorizedListeners.forEach((listener) => listener());
  }
});
