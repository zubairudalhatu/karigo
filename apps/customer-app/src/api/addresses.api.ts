import { api } from "./client";

export interface Address {
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

export type AddressInput = Omit<Address, "id" | "country"> & { country?: string };

export const addressesApi = {
  list: () => api.get<Address[]>("addresses"),
  create: (body: AddressInput) => api.post<Address>("addresses", body),
  update: (id: string, body: Partial<AddressInput>) => api.patch<Address>(`addresses/${id}`, body),
  remove: (id: string) => api.delete<{ id: string }>(`addresses/${id}`),
  setDefault: (id: string) => api.patch<Address>(`addresses/${id}/default`)
};
