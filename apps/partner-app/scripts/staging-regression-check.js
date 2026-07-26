const fs = require("node:fs");
const path = require("node:path");

const appRoot = path.resolve(__dirname, "..");
const read = (relativePath) => fs.readFileSync(path.join(appRoot, relativePath), "utf8");
const readJson = (relativePath) => JSON.parse(read(relativePath));

const failures = [];
const expect = (condition, message) => {
  if (!condition) failures.push(message);
};

const packageJson = readJson("package.json");
const appJson = readJson("app.json");
const easJson = readJson("eas.json");
const appConfig = read("app.config.ts");
const rootLayout = read("app/_layout.tsx");
const login = read("app/auth/login.tsx");
const dashboard = read("app/index.tsx");
const orders = read("app/orders/index.tsx");
const products = read("app/products/index.tsx");
const services = read("app/services/index.tsx");
const documents = read("app/documents/index.tsx");
const profile = read("app/profile/index.tsx");
const apiClient = read("src/api/client.ts");
const authContext = read("src/contexts/auth-context.tsx");
const partnerApi = read("src/api/partner.api.ts");
const nav = read("src/components/partner-navigation.tsx");

expect(packageJson.name === "@karigo/partner-app", "Partner app package name must be @karigo/partner-app.");
expect(packageJson.main === "expo-router/entry", "Partner app must use Expo Router entry.");
expect(packageJson.dependencies?.["expo"] === "~53.0.0", "Partner app must use Expo SDK 53.");
expect(packageJson.dependencies?.["expo-secure-store"] === "~14.2.3", "Partner app must persist tokens with Expo SecureStore.");
expect(!JSON.stringify(packageJson).includes("eas-cli"), "Partner app must not depend on eas-cli.");

expect(appJson.expo.name === "KariGO Partner", "Base app.json name must be KariGO Partner.");
expect(appJson.expo.slug === "karigo-partner", "Base app.json slug must be karigo-partner.");
expect(appJson.expo.scheme === "karigo-partner", "Base app.json scheme must be karigo-partner.");
expect(!JSON.stringify(appJson).includes("projectId"), "Partner app must not invent an EAS project ID before linking.");

expect(appConfig.includes("KariGO Partner"), "App config must use KariGO Partner branding.");
expect(appConfig.includes("KariGO Partner Staging"), "App config must support staging branding.");
expect(appConfig.includes("com.karigo.partner"), "Production package must be com.karigo.partner.");
expect(appConfig.includes("com.karigo.partner.staging"), "Staging package must be com.karigo.partner.staging.");
expect(appConfig.includes("karigo-partner"), "Production scheme must be karigo-partner.");
expect(appConfig.includes("EXPO_PUBLIC_API_BASE_URL"), "App config must read EXPO_PUBLIC_API_BASE_URL.");
expect(!appConfig.includes("https://u.expo.dev/"), "Partner app must not configure an Expo Updates URL before EAS project linking.");

expect(easJson.build?.["partner-staging"]?.distribution === "internal", "partner-staging must be internal.");
expect(easJson.build?.["partner-staging"]?.android?.buildType === "apk", "partner-staging must produce APK.");
expect(easJson.build?.["partner-production"]?.distribution === "store", "partner-production must be store distribution.");
expect(easJson.build?.["partner-production"]?.android?.buildType === "app-bundle", "partner-production must produce AAB.");
expect(
  easJson.build?.["partner-production"]?.env?.EXPO_PUBLIC_API_BASE_URL === "https://karigo-8htn.onrender.com/api/v1",
  "partner-production must point at the production Render API."
);

expect(apiClient.includes("karigo_partner_access_token"), "Partner app must use partner-specific access token key.");
expect(apiClient.includes("karigo_partner_refresh_token"), "Partner app must use partner-specific refresh token key.");
expect(apiClient.includes("refreshAuth"), "Partner app must support refresh sessions.");
expect(authContext.includes('currentUser.role === "VENDOR"'), "Partner app must currently accept approved VENDOR role accounts.");
expect(authContext.includes("KariGO Partner app"), "Role rejection copy must use Partner app branding.");
expect(login.includes("KariGO Partner"), "Login screen must use KariGO Partner branding.");
expect(login.includes("Start Partner Onboarding"), "Login screen must link new partners to onboarding.");
expect(login.includes("https://vendor.karigo.com.ng/register"), "Login screen must route onboarding to Partner Workspace registration.");
expect(login.includes("passwordVisible"), "Login screen must include password visibility controls.");

expect(rootLayout.includes("PartnerBottomNav"), "Root layout must mount Partner bottom navigation.");
expect(nav.includes("Home") && nav.includes("Orders") && nav.includes("Products") && nav.includes("Services") && nav.includes("Profile"), "Bottom nav must expose Partner foundation tabs.");
expect(nav.includes("pathname.startsWith(\"/auth\")"), "Bottom nav must hide on auth screens.");

expect(partnerApi.includes("vendors/me"), "Partner API must load existing vendor/partner profile endpoint.");
expect(partnerApi.includes("vendor-dashboard/orders"), "Partner API must load existing vendor orders endpoint.");
expect(partnerApi.includes("vendor/products"), "Partner API must load existing vendor products endpoint.");
expect(partnerApi.includes("vendors/services"), "Partner API must load existing vendor services endpoint.");
expect(partnerApi.includes("vendors/onboarding-documents"), "Partner API must load onboarding document endpoint.");

expect(dashboard.includes("Product Seller") && dashboard.includes("Service Provider") && dashboard.includes("Both"), "Dashboard must describe supported partner types.");
expect(dashboard.includes("Your partner profile is not active."), "Dashboard must handle missing Partner profile safely.");
expect(dashboard.includes("Contact Support"), "Missing profile state must expose support.");
expect(dashboard.includes("No active orders yet"), "Dashboard must have a safe empty order state.");
expect(orders.includes("Partner orders"), "Orders screen must be Partner branded.");
expect(products.includes("Product Seller"), "Products screen must use Product Seller language.");
expect(services.includes("Service Provider"), "Services screen must use Service Provider language.");
expect(documents.includes("Uploads remain controlled through Partner Workspace"), "Documents screen must keep uploads guarded in foundation release.");
expect(profile.includes("Mobile foundation scope"), "Profile must disclose this is foundation scope.");
expect(profile.includes("Log out"), "Profile screen must expose logout.");

if (failures.length) {
  console.error("Partner app regression check failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Partner app regression check passed.");
