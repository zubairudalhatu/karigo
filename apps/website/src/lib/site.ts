export const site = {
  preferredUrl: process.env.NEXT_PUBLIC_SITE_URL || "https://www.karigo.com.ng",
  apiBaseUrl: process.env.NEXT_PUBLIC_API_BASE_URL || "https://karigo-8htn.onrender.com/api/v1",
  email: "meetup@karigo.com.ng",
  phone: "+234 805 709 2686",
  location: "Kano, Nigeria"
};

export const services = [
  { title: "Food Delivery", icon: "FD", description: "Meals from trusted restaurants and kitchens.", status: "Live" },
  { title: "Groceries", icon: "GR", description: "Daily essentials from local grocery vendors.", status: "Live" },
  { title: "Taxi", icon: "TX", description: "Verified driver onboarding and fare controls are being prepared.", status: "Coming soon" },
  { title: "Market Items", icon: "MK", description: "Household and everyday market items across Kano.", status: "Live" },
  { title: "Pharmacy", icon: "PH", description: "Approved pharmacy marketplace readiness is in progress.", status: "Preparing launch" },
  { title: "Parcel Delivery", icon: "PK", description: "Send packages safely across selected Kano areas.", status: "Live" },
  { title: "SME Errands", icon: "SM", description: "Business and personal errands handled through KariGO.", status: "Live" },
  { title: "Airtime", icon: "AT", description: "Secure merchant integrations are being prepared.", status: "Coming soon" },
  { title: "Data", icon: "DT", description: "Data bundle payments are planned for a later phase.", status: "Coming soon" },
  { title: "Electricity", icon: "EL", description: "Electricity bill payments are not live yet.", status: "Coming soon" },
  { title: "Cable TV", icon: "TV", description: "Cable TV subscriptions are planned for future launch.", status: "Coming soon" }
];

export const liveServices = ["Food Delivery", "Groceries", "Market Items", "Parcel Delivery", "SME Errands"];
export const preparingServices = ["Taxi", "Pharmacy", "Airtime", "Data", "Electricity", "Cable TV"];
