export const userRoles = ["CUSTOMER", "VENDOR", "RIDER", "ADMIN"] as const;
export type UserRole = (typeof userRoles)[number];

export const serviceCategories = [
  "FOOD",
  "GROCERY",
  "MARKET",
  "PHARMACY",
  "PARCEL",
  "ERRAND",
  "CORPORATE"
] as const;
export type ServiceCategory = (typeof serviceCategories)[number];

export const productCategories = [
  "FOOD",
  "GROCERIES",
  "MARKET_ITEMS"
] as const;
export type ProductCategory = (typeof productCategories)[number];

export const orderStatuses = [
  "DRAFT",
  "AWAITING_PAYMENT",
  "PAID",
  "VENDOR_CONFIRMING",
  "VENDOR_ACCEPTED",
  "VENDOR_REJECTED",
  "PREPARING",
  "READY_FOR_PICKUP",
  "RIDER_ASSIGNED",
  "RIDER_ARRIVING_PICKUP",
  "PICKED_UP",
  "ON_THE_WAY",
  "ARRIVED_DESTINATION",
  "DELIVERED",
  "COMPLETED",
  "CANCELLED",
  "FAILED",
  "REFUND_REQUESTED",
  "REFUNDED"
] as const;
export type OrderStatus = (typeof orderStatuses)[number];

export * from "./api";
export * from "./auth";
export * from "./notifications";
export * from "./orders";
export * from "./payments";
export * from "./promos";
export * from "./riders";
export * from "./support";
export * from "./utilities";
export * from "./vendors";
