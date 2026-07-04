const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");

const root = path.resolve(__dirname, "..");
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), "utf8");

const layout = read("app", "_layout.tsx");
["index", "auth/login", "tabs/home", "orders/index", "support/index", "addresses", "profile", "notifications"]
  .forEach((route) => assert(layout.includes(`<Stack.Screen name="${route}" options={headerless}`), `Root screen must hide native header: ${route}`));
["vendors/[id]", "catalogue/[category]", "products/[id]", "cart", "checkout", "orders/[id]", "support/[id]", "addresses/[id]", "parcel"]
  .forEach((route) => assert(layout.includes(`<Stack.Screen name="${route}" options={backOnly}`), `Flow/detail screen must keep back-only header: ${route}`));
["Home", "Vendor", "Cart", "Checkout", "Order details", "Support centre", "Addresses", "Profile", "Send parcel", "Login"]
  .forEach((title) => assert(!layout.includes(`title: "${title}"`), `Native header title must be hidden: ${title}`));
assert(layout.includes("headerTitle: \"\""), "Back-only header must hide native title text.");
assert(layout.includes("headerTintColor: brand.colors.charcoal"), "Back arrow should use charcoal styling.");
assert(layout.includes("headerStyle: { backgroundColor: brand.colors.white }"), "Header top area should stay minimal white.");

const ui = read("src", "components", "ui.tsx");
assert(ui.includes("paddingTop: 56"), "Screen safe-area/status-bar spacing must remain in place.");
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

const home = read("app", "tabs", "home.tsx");
assert(home.includes("Food, groceries, parcels and errands across Kano."), "Home must use approved concise KariGO positioning copy.");
assert(home.includes("Food Delivery"), "Home must keep Food Delivery service category.");
assert(home.includes("Groceries"), "Home must keep Groceries service category.");
assert(home.includes("Market Items"), "Home must keep Market Items service category.");
assert(home.includes("Parcel Delivery"), "Home must keep Parcel Delivery service category.");
assert(home.includes("SME Errands"), "Home must keep SME Errands service category.");
assert(home.includes("Search food, groceries, vendors or area"), "Home search should support category discovery language.");
assert(home.includes("/catalogue/food"), "Food Delivery chip must navigate to food catalogue.");
assert(home.includes("/catalogue/groceries"), "Groceries chip must navigate to groceries catalogue.");
assert(home.includes("/catalogue/market-items"), "Market Items chip must navigate to market-items catalogue.");
assert(home.includes("/parcel?mode=errand"), "SME Errands chip must navigate to the errand flow.");
assert(home.includes("Food near you"), "Home must group food products.");
assert(home.includes("Groceries near you"), "Home must group grocery products.");
assert(home.includes("Market items near you"), "Home must group market products.");
assert(home.includes("productsApi.catalogue"), "Home must use the catalogue API.");

const catalogue = read("app", "catalogue", "[category].tsx");
assert(catalogue.includes("Food delivery"), "Food catalogue heading must exist.");
assert(catalogue.includes("Groceries"), "Groceries catalogue heading must exist.");
assert(catalogue.includes("Market items"), "Market items catalogue heading must exist.");
assert(catalogue.includes("productCategory: config.productCategory"), "Catalogue must query by active product category.");
assert(catalogue.includes("Add to cart"), "Catalogue product cards must allow add-to-cart.");

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
