import { api } from "./client";

export interface Address {
  contentSource?: "USER_SUPPLIED" | "GOOGLE_DERIVED" | "LEGACY_UNKNOWN";
  id: string;
  label: string;
  addressLine: string;
  city: string;
  state: string;
  country: string;
  deliveryNote?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  isDefault: boolean;
}

export type AddressInput = {
  contentSource?: "USER_SUPPLIED" | "LEGACY_UNKNOWN";
  label: string;
  addressLine: string;
  city: string;
  state: string;
  country?: string;
  deliveryNote?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  isDefault?: boolean;
};

export type AddressUpdateInput = Pick<AddressInput,
  "label" | "addressLine" | "city" | "state" | "deliveryNote" | "latitude" | "longitude" | "contentSource"
>;

export function addressUpdateInput(address: Address): AddressUpdateInput {
  return {
    contentSource: address.contentSource === "USER_SUPPLIED" ? "USER_SUPPLIED" : "LEGACY_UNKNOWN",
    label: address.label.trim(),
    addressLine: address.addressLine.trim(),
    city: address.city.trim(),
    state: address.state.trim(),
    deliveryNote: address.deliveryNote?.trim() || null,
    latitude: address.latitude ?? null,
    longitude: address.longitude ?? null
  };
}

export const addressesApi = {
  list: () => api.get<Address[]>("addresses"),
  create: (body: AddressInput) => api.post<Address>("addresses", body),
  update: (id: string, body: AddressUpdateInput) => api.patch<Address>(`addresses/${id}`, body),
  remove: (id: string) => api.delete<{ id: string }>(`addresses/${id}`),
  setDefault: (id: string) => api.patch<Address>(`addresses/${id}/default`)
};
