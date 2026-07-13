export const site = {
  preferredUrl: process.env.NEXT_PUBLIC_SITE_URL || "https://www.karigo.com.ng",
  apiBaseUrl: process.env.NEXT_PUBLIC_API_BASE_URL || "https://karigo-8htn.onrender.com/api/v1"
};

export const services = [
  { title: "Food Delivery", icon: "food", description: "Meals from trusted restaurants and kitchens.", status: "Live" },
  { title: "Groceries", icon: "groceries", description: "Daily essentials from local grocery vendors.", status: "Live" },
  { title: "KariGO Rides", icon: "taxi", description: "Ride Captain onboarding, vehicle checks and fare controls are being prepared.", status: "Coming soon" },
  { title: "Market Items", icon: "market", description: "Household and everyday market items across Kano.", status: "Live" },
  { title: "Pharmacy", icon: "pharmacy", description: "Pharmacy marketplace service is being prepared.", status: "Preparing launch" },
  { title: "Parcel Delivery", icon: "parcel", description: "Send packages safely across selected Kano areas.", status: "Live" },
  { title: "SME Services", icon: "smeServices", description: "Request approved skilled service providers for homes, shops and businesses.", status: "Live" },
  { title: "Airtime", icon: "airtime", description: "Secure merchant integrations are being prepared.", status: "Coming soon" },
  { title: "Data", icon: "data", description: "Data bundle payments are planned for a later phase.", status: "Coming soon" },
  { title: "Electricity", icon: "electricity", description: "Electricity bill payments are not live yet.", status: "Coming soon" },
  { title: "Cable TV", icon: "cable", description: "Cable TV subscriptions are planned for future launch.", status: "Coming soon" }
];

export const liveServices = ["Food Delivery", "Groceries", "Market Items", "Parcel Delivery", "SME Services"];
export const preparingServices = ["KariGO Rides", "Pharmacy", "Airtime", "Data", "Electricity", "Cable TV"];
