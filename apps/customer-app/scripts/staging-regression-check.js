const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");

const root = path.resolve(__dirname, "..");
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), "utf8");

const layout = read("app", "_layout.tsx");
["index", "auth/login", "tabs/home", "orders/index", "support/index", "addresses", "profile", "notifications"]
  .forEach((route) => assert(layout.includes(`<Stack.Screen name="${route}" options={headerless}`), `Root screen must hide native header: ${route}`));
["vendors/[id]", "catalogue/[category]", "products/[id]", "readiness/[service]", "taxi/waitlist", "utilities/[service]", "utilities/history", "utilities/transactions/[id]", "cart", "checkout", "orders/[id]", "support/[id]", "addresses/[id]", "parcel", "vendor/apply", "vendor/application-status"]
  .forEach((route) => assert(layout.includes(`<Stack.Screen name="${route}" options={backOnly}`), `Flow/detail screen must keep back-only header: ${route}`));
assert(layout.includes('<Stack.Screen name="utilities/index" options={headerless}'), "Utilities hub must hide native header.");
["Home", "Vendor", "Cart", "Checkout", "Order details", "Support centre", "Addresses", "Profile", "Send parcel", "Login"]
  .forEach((title) => assert(!layout.includes(`title: "${title}"`), `Native header title must be hidden: ${title}`));
assert(layout.includes("headerTitle: \"\""), "Back-only header must hide native title text.");
assert(layout.includes("headerTintColor: brand.colors.charcoal"), "Back arrow should use charcoal styling.");
assert(layout.includes("headerStyle: { backgroundColor: brand.colors.white }"), "Header top area should stay minimal white.");

const ui = read("src", "components", "ui.tsx");
assert(ui.includes("paddingTop: 56"), "Screen safe-area/status-bar spacing must remain in place.");
assert(ui.includes("screenNoTopPadding"), "Screens with the KariGO top bar must be able to remove legacy top padding.");
assert(ui.includes("heroTitle"), "Shared UI must include content-first hero titles.");
assert(ui.includes("cardTitle"), "Shared UI must include readable card titles.");
assert(ui.includes("chipGrid"), "Shared UI must include category/service chip layout.");
assert(ui.includes("vendorImage"), "Shared UI must include visual vendor card image areas.");
assert(ui.includes("priceRow"), "Shared UI must include structured pricing rows.");
assert(ui.includes("payable"), "Shared UI must include strong payable total styling.");
assert(ui.includes("productImage"), "Shared UI must include product image styling.");

const client = read("src", "api", "client.ts");
assert(client.includes("expo-secure-store"), "Customer session tokens must use Expo SecureStore.");
assert(client.includes("karigo_customer_refresh_token"), "Customer app must persist refresh tokens separately.");
assert(client.includes("auth/refresh"), "Customer API client must support session refresh.");
assert(!client.includes("AsyncStorage"), "Customer auth tokens must not use AsyncStorage.");
assert(ui.includes("paddingBottom: 112"), "Customer screens must leave room for bottom navigation.");

const home = read("app", "tabs", "home.tsx");
assert(home.includes("KariGoAppTopBar"), "Home must use the branded KariGO top bar.");
assert(home.includes("Welcome, {firstName(user?.fullName)}"), "Home greeting must use safe first-name fallback.");
assert(home.includes("Food Delivery"), "Home must keep Food Delivery service category.");
assert(home.includes("Groceries"), "Home must keep Groceries service category.");
assert(home.includes("Taxi"), "Home must include Taxi readiness tile.");
assert(home.includes("Market Items"), "Home must keep Market Items service category.");
assert(home.includes("Pharmacy"), "Home must include the compliance-gated Pharmacy category.");
assert(home.includes("Parcel Delivery"), "Home must keep Parcel Delivery service category.");
assert(home.includes("SME Errand"), "Home must keep SME Errand service category.");
assert(home.includes("Airtime"), "Home must include Airtime readiness tile.");
assert(home.includes("Data"), "Home must include Data readiness tile.");
assert(home.includes("Electricity"), "Home must include Electricity readiness tile.");
assert(home.includes("Cable TV"), "Home must include Cable TV readiness tile.");
assert(home.includes("/catalogue/food"), "Food Delivery chip must navigate to food catalogue.");
assert(home.includes("/catalogue/groceries"), "Groceries chip must navigate to groceries catalogue.");
assert(home.includes("/catalogue/market-items"), "Market Items chip must navigate to market-items catalogue.");
assert(home.includes("/readiness/taxi"), "Taxi must route to a safe readiness screen.");
assert(home.includes("EXPO_PUBLIC_PHARMACY_MARKETPLACE_ENABLED"), "Pharmacy must remain readiness-gated by environment.");
assert(home.includes("/readiness/pharmacy"), "Disabled pharmacy must route to a readiness screen.");
assert(home.includes("/parcel?mode=errand"), "SME Errands chip must navigate to the errand flow.");
assert(home.includes("Bills & Utilities"), "Home must include a Bills & Utilities readiness section.");
assert(home.includes("utilityServices"), "Bills & Utilities section must use safe utility readiness tiles.");
assert(home.includes("/utilities/airtime"), "Airtime must route to the safe utility test flow.");
assert(home.includes("/utilities/data"), "Data must route to the safe utility test flow.");
assert(home.includes("/utilities/electricity"), "Electricity must route to the safe utility test flow.");
assert(home.includes("/utilities/cable-tv"), "Cable TV must route to the safe utility test flow.");
assert(home.includes("Run safe test-mode utility transactions"), "Bills & Utilities section must state test-mode availability.");
assert(home.includes("useWindowDimensions"), "Service grid must adapt between compact two and three column layouts.");
assert(home.includes("Today's featured for you"), "Home must show vendor/campaign featured content.");
assert(home.includes("Ad"), "Home must expose a clearly labelled internal ad placement.");
assert(home.includes("VendorSpotlight"), "Home featured content must be vendor-focused.");
assert(!home.includes("productsApi.catalogue"), "Home must not load individual product feeds.");
assert(!home.includes("Add to cart"), "Home must not expose product add-to-cart actions.");
assert(!home.includes("href=\"/addresses\""), "Home must not show the old dense text-link menu.");

const readiness = read("src", "components", "readiness-screen.tsx");
assert(readiness.includes("ReadinessScreen"), "Reusable readiness screen component must exist.");
assert(readiness.includes("Back to home"), "Readiness screen must include a safe home CTA.");
assert(readiness.includes("secondaryCta"), "Readiness screen must support a secondary CTA for safe waitlists.");
const readinessRoute = read("app", "readiness", "[service].tsx");
assert(readinessRoute.includes("Taxi is coming soon. KariGO is preparing verified driver onboarding"), "Taxi readiness message must be explicit.");
assert(readinessRoute.includes("Join Taxi Waitlist"), "Taxi readiness route must expose the waitlist CTA.");
assert(readinessRoute.includes("/taxi/waitlist"), "Taxi readiness route must navigate to the customer waitlist form.");
assert(readinessRoute.includes("Bills & Utilities is coming soon. KariGO is preparing secure provider integrations"), "Bills readiness message must be explicit.");
assert(readinessRoute.includes("Pharmacy is preparing launch"), "Pharmacy disabled state must have safe readiness copy.");
const taxiApi = read("src", "api", "taxi.api.ts");
assert(taxiApi.includes("taxi/waitlist"), "Customer taxi API must submit customer waitlist entries.");
const taxiWaitlist = read("app", "taxi", "waitlist.tsx");
assert(taxiWaitlist.includes("Join Taxi Waitlist"), "Customer taxi waitlist form must exist.");
assert(taxiWaitlist.includes("verified drivers, vehicle checks, fare controls"), "Taxi waitlist form must explain readiness-only controls.");
assert(taxiWaitlist.includes("taxiApi.joinWaitlist"), "Customer taxi waitlist must use the backend readiness endpoint.");

const catalogue = read("app", "catalogue", "[category].tsx");
assert(catalogue.includes("Food delivery"), "Food catalogue heading must exist.");
assert(catalogue.includes("Groceries"), "Groceries catalogue heading must exist.");
assert(catalogue.includes("Market items"), "Market items catalogue heading must exist.");
assert(catalogue.includes("Pharmacy"), "Pharmacy browse heading must exist.");
assert(catalogue.includes("productCategory: config.productCategory"), "Catalogue must query by active product category.");
assert(catalogue.includes("Featured Vendors"), "Browse must display featured vendors before products.");
assert(catalogue.includes("Top Restaurants"), "Browse must include restaurant vendor section.");
assert(catalogue.includes("Top Grocery and Market Vendors"), "Browse must include grocery/market vendor section.");
assert(catalogue.includes("Top Pharmacy Vendors"), "Browse must include pharmacy vendor section.");
assert(catalogue.includes("Top Menus and Products"), "Browse must place product discovery last.");
assert(catalogue.indexOf("Featured Vendors") < catalogue.indexOf("Top Menus and Products"), "Browse must order vendors before products.");

const productsApi = read("src", "api", "products.api.ts");
assert(productsApi.includes("query.set(\"category\""), "Customer product API must use the public category query parameter.");
const vendorsApi = read("src", "api", "vendors.api.ts");
assert(vendorsApi.includes("serviceCategory"), "Customer vendor API must support service-category browsing.");

const cartContext = read("src", "contexts", "cart-context.tsx");
assert(cartContext.includes("notice"), "Cart context must expose add-to-cart feedback notice.");
assert(cartContext.includes("addingProductIds"), "Cart context must track short add-button lockout.");
assert(cartContext.includes("setTimeout"), "Cart add feedback must auto-dismiss.");

const bottomNav = read("src", "components", "customer-navigation.tsx");
assert(bottomNav.includes("CustomerBottomNav"), "Bottom navigation component must exist.");
assert(bottomNav.includes("Home") && bottomNav.includes("Browse") && bottomNav.includes("Cart") && bottomNav.includes("Orders") && bottomNav.includes("Profile"), "Bottom navigation must include primary customer tabs.");
assert(bottomNav.includes("@expo/vector-icons"), "Bottom navigation must use real icons instead of first-letter substitutes.");
assert(bottomNav.includes("cart.count > 0"), "Bottom navigation must show a numeric cart badge.");
assert(bottomNav.includes("View cart"), "Cart snackbar must include a View cart action.");
assert(bottomNav.includes("pathname.startsWith(\"/auth\")"), "Bottom navigation must stay hidden across auth screens.");

const profile = read("app", "profile.tsx");
assert(profile.includes("Saved addresses"), "Addresses must be accessible from Profile.");
assert(profile.includes("Support centre"), "Support must be accessible from Profile.");
assert(profile.includes("Utility test history"), "Utility history must be accessible from Profile.");
assert(profile.includes("Become a KariGO Vendor"), "Profile must link to public vendor application flow.");

const utilitiesApi = read("src", "api", "utilities.api.ts");
assert(utilitiesApi.includes("utilities/providers"), "Customer utilities API must load public providers.");
assert(utilitiesApi.includes("customer/utilities/quote"), "Customer utilities API must quote test transactions.");
assert(utilitiesApi.includes("customer/utilities/transactions"), "Customer utilities API must create and list utility transactions.");
const utilitiesHome = read("app", "utilities", "index.tsx");
assert(utilitiesHome.includes("Bills & Utilities is currently in test mode"), "Utilities hub must show safety copy.");
assert(utilitiesHome.includes("Airtime") && utilitiesHome.includes("Data") && utilitiesHome.includes("Electricity") && utilitiesHome.includes("Cable TV"), "Utilities hub must show all four services.");
assert(utilitiesHome.includes("/utilities/history"), "Utilities hub must link to history.");
const utilityFlow = read("app", "utilities", "[service].tsx");
assert(utilityFlow.includes("Run Test Transaction"), "Utility confirm button must say Run Test Transaction.");
assert(!utilityFlow.includes("Pay Now"), "Utility flow must not use Pay Now wording.");
assert(utilityFlow.includes("No real airtime, data, electricity token or cable subscription will be delivered."), "Utility flow must include test-mode safety copy.");
assert(utilityFlow.includes("utilitiesApi.quote"), "Utility flow must quote through backend.");
assert(utilityFlow.includes("utilitiesApi.create"), "Utility flow must create through backend mock transaction endpoint.");
const utilityReceipt = read("app", "utilities", "transactions", "[id].tsx");
assert(utilityReceipt.includes("Test transaction receipt"), "Utility receipt detail must be explicit.");
assert(utilityReceipt.includes("No real airtime, data, electricity token or cable subscription was delivered."), "Utility receipt must keep test-mode safety copy.");

const checkout = read("app", "checkout.tsx");
assert(checkout.includes("Delivery fee:"), "Checkout must show delivery fee.");
assert(checkout.includes("Waiting for server quote"), "Checkout must not show zero fee when quote is absent.");
assert(checkout.includes("Updating delivery total..."), "Checkout must show quote refresh loading state.");
assert(checkout.includes("Retry delivery total"), "Checkout must expose quote retry action.");
assert(checkout.includes("quoteReady"), "Checkout must track whether a server quote is valid.");
assert(checkout.includes("!quoteReady"), "Checkout must block order creation without a valid quote.");
assert(checkout.includes("ordersApi.quote"), "Checkout must load server-authoritative quote before order creation.");
assert(checkout.includes("setQuote(null);"), "Checkout must clear stale quote while refreshing.");
assert(checkout.includes("quote.quoteReference"), "Checkout must display a server quote reference.");
assert(checkout.includes("validPromoCode"), "Checkout must separate typed promo from validated promo.");
assert(!checkout.includes("deliveryFee: 1000"), "Checkout must not hardcode staging delivery fee.");
assert(checkout.includes("loadQuote(code, { promoAttempt: true })"), "Promo success must refresh the server quote.");
assert(checkout.includes("await loadQuote(\"\", { keepUiError: true })"), "Promo failure must refresh a non-promo quote.");

const orderDetail = read("app", "orders", "[id].tsx");
assert(orderDetail.includes("Delivery fee:"), "Order detail must show delivery fee.");
assert(orderDetail.includes("Payable:"), "Order detail must show payable total.");
assert(orderDetail.includes("ordersApi.deliveryOtp"), "Order detail must fetch delivery OTP through the dedicated endpoint.");
assert(orderDetail.includes("[\"ARRIVED_DESTINATION\", \"DELIVERED\"].includes(order.orderStatus)"), "Delivery OTP must stay hidden before rider arrival.");
assert(orderDetail.includes("Show delivery code"), "Customer must explicitly reveal the delivery code.");
assert(orderDetail.includes("Only share this code after you have received your order."), "Delivery OTP safety copy must be visible.");
assert(orderDetail.includes("Retry delivery code"), "Delivery OTP fetch failures must have a retry action.");
assert(orderDetail.includes("setDeliveryOtp(\"\")"), "Delivery OTP must reset when status/order changes or fetch fails.");

const ordersApi = read("src", "api", "orders.api.ts");
assert(ordersApi.includes("orders/${id}/delivery-otp"), "Customer app must use the delivery OTP endpoint.");

const promoState = read("src", "lib", "promo-state.ts");
assert(promoState.includes("This promo code has already been used on your account."), "Reused promo message must be customer-friendly.");

const pricing = read("src", "lib", "checkout-pricing.ts");
assert(pricing.includes("deliveryFee: toNumber(source.deliveryFee)"), "Explicit backend zero-fee quotes must be preserved.");

const support = read("app", "support", "index.tsx");
assert(support.includes("useFocusEffect"), "Support centre must refresh on focus.");
assert(support.includes("onRefresh={load}"), "Support centre must support pull-to-refresh.");
assert(support.includes("setTickets((current) => [created,"), "Support centre must insert newly created tickets immediately.");
assert(support.includes("ticket.category"), "Support ticket list must show category.");
assert(support.includes("ticket.status"), "Support ticket list must show status.");
assert(support.includes("ticket.priority"), "Support ticket list must show priority.");

console.log("Customer staging regression checks passed.");
