const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

const root = path.resolve(__dirname, "..");
const repo = path.resolve(root, "..", "..");
const read = (...parts) => fs.readFileSync(path.join(...parts), "utf8");
const policySource = read(root, "src", "lib", "admob-policy.ts");
const policyJs = ts.transpileModule(policySource, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const policyModule = { exports: {} };
vm.runInNewContext(`(function(exports, require, module){${policyJs}\n})(policyModule.exports, require, policyModule);`, { policyModule, require });
const { selectNativeAdUnitId, shouldRequestAdMob, ADMOB_PRODUCTION_NATIVE_UNIT_ID, ADMOB_TEST_NATIVE_UNIT_ID } = policyModule.exports;

assert.equal(shouldRequestAdMob({ placementSource: "KARIGO", firstPartyAdCount: 1, consentCanRequestAds: true, runtimeReady: true }), false, "KariGO inventory must suppress AdMob");
assert.equal(shouldRequestAdMob({ placementSource: "ADMOB_FALLBACK", firstPartyAdCount: 0, consentCanRequestAds: true, runtimeReady: true }), true, "empty KariGO inventory should permit fallback");
assert.equal(shouldRequestAdMob({ placementSource: "NONE", firstPartyAdCount: 0, consentCanRequestAds: true, runtimeReady: true }), false, "NONE must render no ad");
assert.equal(selectNativeAdUnitId({ isDevelopment: true, appEnvironment: "production" }), ADMOB_TEST_NATIVE_UNIT_ID, "development must use Google's test unit");
assert.equal(selectNativeAdUnitId({ isDevelopment: false, appEnvironment: "staging" }), ADMOB_TEST_NATIVE_UNIT_ID, "staging must use Google's test unit");
assert.equal(selectNativeAdUnitId({ isDevelopment: false, appEnvironment: "production" }), ADMOB_PRODUCTION_NATIVE_UNIT_ID, "production config must select the production unit");
assert.equal(selectNativeAdUnitId({ isDevelopment: false, appEnvironment: "production", testMode: true }), ADMOB_TEST_NATIVE_UNIT_ID, "the production-package QA build must be locked to Google's test unit");
assert.equal(shouldRequestAdMob({ placementSource: "ADMOB_FALLBACK", firstPartyAdCount: 0, consentCanRequestAds: false, runtimeReady: true }), false, "consent must gate requests");
assert.equal(shouldRequestAdMob({ placementSource: "ADMOB_FALLBACK", firstPartyAdCount: 0, consentCanRequestAds: true, runtimeReady: false }), false, "account readiness must gate production requests");

const component = read(root, "src", "components", "admob-native-fallback.tsx");
assert.match(component, /\.catch\(\(\) => undefined\)/, "load errors must be silent and non-blocking");
assert.match(component, /LOAD_TIMEOUT_MS = 8_000/, "loading must be bounded");
assert.match(component, /currentAd\.current\?\.destroy\(\)/, "native ad must be destroyed on cleanup");
assert.match(component, /requestNonPersonalizedAdsOnly: true/, "fallback requests must be conservative");
assert.doesNotMatch(component, /recordEvent|IMPRESSION|CLICK/, "AdMob events must not enter KariGO campaign metrics");

const appConfig = read(root, "app.config.ts");
const eas = JSON.parse(read(root, "eas.json"));
assert.match(appConfig, /androidAppId: "ca-app-pub-8797316301984037~1272004979"/, "Android App ID must be configured through the Expo plugin");
assert.match(appConfig, /newArchEnabled: false/, "Customer Android must use the RN 0.79-compatible legacy architecture for AdMob 16.5.0");
assert.match(appConfig, /delayAppMeasurementInit: true/, "measurement initialization must wait for consent");
assert.notEqual(eas.build["customer-production"].env.EXPO_PUBLIC_ADMOB_PRODUCTION_READY, "true", "production requests must remain readiness-gated until the account/app is cleared");
assert.equal(eas.build["customer-admob-qa"].android.buildType, "apk", "AdMob QA must create an APK, never an AAB");
assert.equal(eas.build["customer-admob-qa"].env.EXPO_PUBLIC_ADMOB_TEST_MODE, "true", "AdMob QA must force the official test unit");
assert.equal(eas.build["customer-admob-qa"].env.EXPO_PUBLIC_ADMOB_QA_FORCE_FALLBACK, "true", "AdMob QA must safely bridge the pre-contract backend only when inventory is empty");

const home = read(root, "app", "tabs", "home.tsx");
const adsApi = read(root, "src", "api", "ads.api.ts");
assert.match(home, /adsApi\.recordEvent\(homeAd\.id, "IMPRESSION"/, "first-party impression tracking must remain");
assert.match(home, /adPlacement\.source === "ADMOB_FALLBACK"/, "home must use the backend placement decision");
assert.match(home, /firstPartyAdCount=\{ads\.length\}/, "loaded direct inventory must independently suppress AdMob");
assert.match(adsApi, /EXPO_PUBLIC_ADMOB_TEST_MODE.*EXPO_PUBLIC_ADMOB_QA_FORCE_FALLBACK/, "the QA compatibility fallback must require both QA flags");

const captainPackage = read(repo, "apps", "rider-app", "package.json");
const partnerPackage = read(repo, "apps", "partner-app", "package.json");
assert.doesNotMatch(captainPackage, /react-native-google-mobile-ads/, "Captain must remain unaffected");
assert.doesNotMatch(partnerPackage, /react-native-google-mobile-ads/, "Partner must remain unaffected");

console.log("Customer AdMob fallback regression checks passed (14 controls).");
