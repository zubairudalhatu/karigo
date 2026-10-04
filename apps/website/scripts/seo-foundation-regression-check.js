const fs = require("fs");
const path = require("path");
const { pathToFileURL } = require("url");

const websiteRoot = path.join(__dirname, "..");
const repoRoot = path.join(websiteRoot, "..", "..");
const read = (...parts) => fs.readFileSync(path.join(websiteRoot, ...parts), "utf8");
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const publicPages = new Map([
  ["/contact", "app/contact/page.tsx"],
  ["/riders", "app/riders/page.tsx"],
  ["/vendors", "app/vendors/page.tsx"],
  ["/vendors/apply", "app/vendors/apply/page.tsx"],
  ["/safety", "app/safety/page.tsx"],
  ["/careers", "app/careers/page.tsx"],
  ["/privacy", "app/privacy/page.tsx"],
  ["/terms", "app/terms/page.tsx"],
  ["/account-deletion", "app/account-deletion/page.tsx"],
  ["/refunds", "app/refunds/page.tsx"],
  ["/returns", "app/returns/page.tsx"],
  ["/services", "app/services/page.tsx"],
  ["/sme-services/apply", "app/sme-services/apply/page.tsx"]
]);

async function main() {
  const seo = read("src", "lib", "seo.ts");
  assert(seo.includes('canonicalOrigin = "https://karigo.com.ng"'), "Canonical origin must be the apex HTTPS host.");
  assert(!seo.includes("https://www.karigo.com.ng"), "SEO helpers must not emit the www host.");
  assert(seo.includes("alternates: { canonical }"), "Public metadata must emit canonical links.");
  assert(seo.includes("url: canonical"), "Open Graph URLs must match the page canonical.");
  assert(seo.includes("summary_large_image"), "Twitter metadata must use the prepared share image.");

  for (const [route, file] of publicPages) {
    const source = read(...file.split("/"));
    assert(source.includes("buildPageMetadata"), `${route} must use shared page metadata.`);
    assert(source.includes(`path: "${route}"`), `${route} must declare its exact canonical path.`);
  }

  const layout = read("app", "layout.tsx");
  assert(layout.includes("metadataBase: new URL(canonicalOrigin)"), "metadataBase must use the canonical origin.");
  assert(layout.includes("alternates: { canonical: canonicalOrigin }"), "Homepage canonical must be explicit.");
  assert(layout.includes('"@type": "Organization"') && layout.includes('"@type": "WebSite"'), "Factual Organization and WebSite JSON-LD must be present.");
  assert(layout.includes("JSON.stringify(structuredData).replace"), "Structured data must be safely serialized.");

  const sitemap = read("app", "sitemap.ts");
  assert(sitemap.includes("indexableRoutes.map"), "Sitemap must use the reviewed public route inventory.");
  for (const excluded of ["/app", "/payment/flutterwave/return", "/api/"]) {
    assert(!seo.match(new RegExp(`^[\\s\"]*${excluded.replaceAll("/", "\\/")}[\"']`, "m")), `${excluded} must be excluded from indexableRoutes.`);
  }

  const robots = read("app", "robots.ts");
  assert(robots.includes('allow: ["/", "/app-ads.txt"]'), "Public robots policy must allow the marketing site and the AdMob declaration.");
  assert(robots.includes('absoluteUrl("/sitemap.xml")'), "robots.txt must declare the apex sitemap.");
  for (const blocked of ["/app", "/payment/", "/api/", "/careers/*/apply"]) {
    assert(robots.includes(`"${blocked}"`), `robots.txt must disallow ${blocked}.`);
  }

  const appPage = read("app", "app", "page.tsx");
  const paymentReturn = read("app", "payment", "flutterwave", "return", "page.tsx");
  for (const [label, source] of [["Customer portal", appPage], ["Payment return", paymentReturn]]) {
    assert(source.includes("privatePageRobots"), `${label} must be noindex and nofollow.`);
    assert(source.includes("openGraph: null") && source.includes("twitter: null"), `${label} must not inherit public social metadata.`);
  }
  assert(paymentReturn.includes('absoluteUrl("/payment/flutterwave/return")'), "Payment return canonical must exclude query parameters.");
  assert(!/searchParams|topUpReference|tx_ref|transactionReference/.test(paymentReturn), "Payment return metadata must not read transaction query data.");

  for (const appName of ["admin-portal", "vendor-dashboard"]) {
    const appRoot = path.join(repoRoot, "apps", appName, "app");
    const appLayout = fs.readFileSync(path.join(appRoot, "layout.tsx"), "utf8");
    const appRobots = fs.readFileSync(path.join(appRoot, "robots.ts"), "utf8");
    assert(appLayout.includes("index: false") && appLayout.includes("follow: false"), `${appName} must emit global noindex, nofollow.`);
    assert(appRobots.includes('disallow: "/"'), `${appName} robots policy must block crawling.`);
  }

  const analyticsSafety = read("src", "lib", "analytics-safety.ts");
  assert(analyticsSafety.includes(".pathname"), "Future page tracking must strip query strings and fragments.");
  assert(analyticsSafety.includes("allowedActions") && analyticsSafety.includes("allowedComponents"), "Future analytics labels must use fixed safe vocabularies.");
  assert(analyticsSafety.includes("safeAnalyticsPagePath(input.destination)") && analyticsSafety.includes("safeAnalyticsPagePath(input.page_path)"), "Future analytics URL values must be reduced to pathnames.");
  for (const sensitive of ["email", "phone", "name", "address", "token", "reference", "payment", "free_text"]) {
    assert(!analyticsSafety.includes(`"${sensitive}"`), `Analytics allowlist must not include ${sensitive}.`);
  }
  const analyticsLoader = read("src", "components", "google-analytics.tsx");
  const envExample = read(".env.example");
  assert(layout.includes("<GoogleAnalytics />"), "The privacy-gated analytics loader must be integrated.");
  assert(analyticsLoader.includes("if (!eligible || !bootstrapped) return null"), "The Google script must remain absent until every runtime gate passes and bootstrap is ready.");
  assert(analyticsLoader.includes("send_page_view: false"), "Automatic GA page views must remain disabled.");
  assert(/^NEXT_PUBLIC_GA_MEASUREMENT_ID=\s*$/m.test(envExample), "The example measurement ID must remain blank.");
  assert(!`${layout}\n${analyticsLoader}\n${envExample}`.match(/G-[A-Z0-9]{6,20}/), "No real GA measurement ID may be committed.");
  assert(!`${layout}\n${analyticsLoader}`.match(/GTM-/i), "Google Tag Manager must not be added.");

  for (const asset of ["karigo-social-card.png", "favicon.png", "apple-touch-icon.png"]) {
    assert(fs.statSync(path.join(websiteRoot, "public", asset)).size > 0, `${asset} must exist and be non-empty.`);
  }
  const sharp = require("sharp");
  const social = await sharp(path.join(websiteRoot, "public", "karigo-social-card.png")).metadata();
  assert(social.width === 1200 && social.height === 630, "Social card must be 1200x630.");
  assert(fs.statSync(path.join(websiteRoot, "public", "favicon.png")).size < 100_000, "Optimized favicon must remain below 100KB.");

  const nextConfig = (await import(pathToFileURL(path.join(websiteRoot, "next.config.mjs")).href)).default;
  const redirects = await nextConfig.redirects();
  assert(redirects.length === 1, "Exactly one canonical-host redirect must be configured.");
  const redirect = redirects[0];
  assert(redirect.has?.some((condition) => condition.type === "host" && condition.value === "www.karigo.com.ng"), "Redirect must match only the www host.");
  assert(redirect.destination === "https://karigo.com.ng/:path*" && redirect.permanent === true, "Redirect must preserve paths on the apex host with a permanent status.");

  console.log(`SEO foundation regression checks passed (${publicPages.size + 1} canonical public routes).`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
