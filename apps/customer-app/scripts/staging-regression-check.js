const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");

const root = path.resolve(__dirname, "..");
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), "utf8");

const layout = read("app", "_layout.tsx");
[
  "Home",
  "Vendor",
  "Cart",
  "Checkout",
  "Order details",
  "Support centre",
  "Addresses",
  "Profile",
  "Send parcel"
].forEach((title) => assert(layout.includes(`title: "${title}"`), `Missing route title: ${title}`));

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
