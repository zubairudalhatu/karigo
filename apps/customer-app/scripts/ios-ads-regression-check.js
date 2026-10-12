const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");
const root = path.resolve(__dirname, "..");
function load(relative, dependencies = {}, globals = {}) {
  const source = fs.readFileSync(path.join(root, relative), "utf8");
  const js = ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX
  } }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(`(function(exports, require, module){${js}\n})(module.exports, require, module);`, {
    module, require: (name) => {
      if (!(name in dependencies)) throw new Error(`Unexpected dependency: ${name}`);
      return dependencies[name];
    }, ...globals
  });
  return module.exports;
}
const policy = load("src/lib/admob-policy.ts");
for (const isDevelopment of [false, true]) for (const appEnvironment of ["production", "staging"])
for (const testMode of [false, true]) for (const productionReady of [false, true]) {
  const input = { platform: "android", isDevelopment, appEnvironment, testMode, productionReady, iosProductionReady: false };
  assert.equal(policy.isAdMobConfigurationReady(input), isDevelopment || appEnvironment !== "production" || testMode || productionReady);
  const expectedUnit = isDevelopment || appEnvironment !== "production" || testMode
    ? policy.ADMOB_TEST_NATIVE_UNIT_ID : policy.ADMOB_PRODUCTION_NATIVE_UNIT_ID;
  assert.equal(policy.selectNativeAdUnitId(input), expectedUnit);
}
const production = { platform: "ios", isDevelopment: false, appEnvironment: "production", testMode: false,
  productionReady: true, iosProductionReady: false, iosAppId: policy.ADMOB_IOS_APP_ID };
assert.equal(policy.isAdMobConfigurationReady(production), false, "Android approval cannot enable iOS production ads");
for (const iosAppId of [undefined, "", "invalid", policy.ADMOB_IOS_PRODUCTION_NATIVE_UNIT_ID]) {
  assert.equal(policy.isAdMobConfigurationReady({ ...production, iosProductionReady: true, testMode: true, iosAppId }), false);
}
assert.equal(policy.selectNativeAdUnitId({ ...production, testMode: true }), policy.ADMOB_IOS_TEST_NATIVE_UNIT_ID);
assert.notEqual(policy.ADMOB_IOS_TEST_NATIVE_UNIT_ID, policy.ADMOB_TEST_NATIVE_UNIT_ID);
assert.notEqual(policy.ADMOB_IOS_PRODUCTION_NATIVE_UNIT_ID, policy.ADMOB_PRODUCTION_NATIVE_UNIT_ID);

function consentEffects(platform) {
  const effects = [];
  const calls = { consent: 0, initialization: 0 };
  const react = { createContext: () => ({ Provider: () => null }), useState: (initial) => [initial, () => {}],
    useRef: (initial) => ({ current: initial }), useMemo: (fn) => fn(), useEffect: (fn) => effects.push(fn) };
  const consent = load("src/contexts/admob-consent-context.tsx", {
    react, "react/jsx-runtime": { jsx: () => null }, "react-native": { Platform: { OS: platform } },
    "expo-constants": { default: { expoConfig: { extra: { appEnvironment: "production" } } } },
    "../lib/admob-policy": policy,
    "react-native-google-mobile-ads": { default: () => ({ initialize: async () => { calls.initialization++; } }),
      AdsConsent: { gatherConsent: async () => { calls.consent++; return { canRequestAds: false }; } },
      AdsConsentPrivacyOptionsRequirementStatus: { REQUIRED: "REQUIRED" } }
  }, { __DEV__: false, process: { env: { EXPO_PUBLIC_ADMOB_PRODUCTION_READY: "true", EXPO_PUBLIC_ADMOB_IOS_PRODUCTION_READY: "false" } } });
  consent.AdMobConsentProvider({ children: null });
  for (const effect of effects) effect();
  return calls;
}
assert.deepEqual(consentEffects("ios"), { consent: 0, initialization: 0 }, "contained iOS must not contact UMP or initialize Ads");
assert.equal(consentEffects("android").consent, 1, "Android consent behavior remains intact");
console.log("iOS Ads regression passed: platform IDs, invalid-ID safety, iOS containment, Android parity.");
