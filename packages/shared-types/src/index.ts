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

export const serviceProviderTypes = [
  "PAINTER",
  "PLUMBER",
  "MECHANIC",
  "ELECTRICIAN",
  "CLEANER",
  "CARPENTER",
  "AC_TECHNICIAN",
  "GENERATOR_REPAIR",
  "APPLIANCE_REPAIR",
  "FUMIGATION",
  "WELDER",
  "TILER",
  "CCTV_TECHNICIAN",
  "MOVING_HELP",
  "PRINTING",
  "CAR_HIRE",
  "LAUNDRY",
  "LESSON_TEACHER",
  "LEGAL_PRACTITIONER",
  "RENT_A_CAR",
  "HEALTH_PROFESSIONAL",
  "OTHER"
] as const;
export type ServiceProviderType = (typeof serviceProviderTypes)[number];

export const vendorServiceStatuses = [
  "ACTIVE",
  "INACTIVE",
  "ARCHIVED"
] as const;
export type VendorServiceStatus = (typeof vendorServiceStatuses)[number];

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
export * from "./taxi";
export * from "./utilities";
export * from "./vendors";
