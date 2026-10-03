const assert = require("node:assert/strict");
const fs = require("node:fs");
const Module = require("node:module");
const path = require("node:path");
const ts = require("typescript");

const websiteRoot = path.resolve(__dirname, "..");
const analyticsPath = path.join(websiteRoot, "src/lib/analytics.ts");
const source = fs.readFileSync(analyticsPath, "utf8");
const output = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
}).outputText;
const compiled = new Module(analyticsPath, module);
compiled.filename = analyticsPath;
compiled.paths = module.paths;
compiled._compile(output, analyticsPath);
const analytics = compiled.exports;

function acceptedTransport(command) {
  assert.equal(
    Object.prototype.toString.call(command),
    "[object Arguments]",
    "gtag transport must receive the supported Arguments command shape"
  );
  const [name, target, parameters] = Array.from(command);
  return { name, target, parameters };
}

const dataLayer = [];
const gtag = analytics.createGtagCommandQueue(dataLayer);
gtag("consent", "default", {
  analytics_storage: "granted",
  ad_storage: "denied",
  ad_user_data: "denied",
  ad_personalization: "denied"
});
gtag("js", new Date(0));
gtag("config", ["G", "ABCDEF12"].join("-"), { send_page_view: false });
gtag("event", "page_view", { page_location: "https://karigo.com.ng/services" });

assert.equal(dataLayer.length, 4);
for (const command of dataLayer) {
  assert.equal(Array.isArray(command), false, "gtag commands must not be JavaScript Arrays");
}
assert.deepEqual(acceptedTransport(dataLayer[0]), {
  name: "consent",
  target: "default",
  parameters: {
    analytics_storage: "granted",
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied"
  }
});
assert.deepEqual(acceptedTransport(dataLayer[2]), {
  name: "config",
  target: "G-ABCDEF12",
  parameters: { send_page_view: false }
});
assert.deepEqual(acceptedTransport(dataLayer[3]), {
  name: "event",
  target: "page_view",
  parameters: { page_location: "https://karigo.com.ng/services" }
});

const legacyLayer = [];
const legacyGtag = (...args) => legacyLayer.push(args);
legacyGtag("event", "page_view", { page_location: "https://karigo.com.ng/services" });
assert.equal(Array.isArray(legacyLayer[0]), true);
assert.throws(
  () => acceptedTransport(legacyLayer[0]),
  /supported Arguments command shape/,
  "the regression must reject the former rest-parameter Array wrapper"
);

const component = fs.readFileSync(path.join(websiteRoot, "src/components/google-analytics.tsx"), "utf8");
const bootstrapIndex = component.indexOf("window.gtag = createGtagCommandQueue(dataLayer)");
const loaderIndex = component.indexOf("<Script");
const configIndex = component.indexOf('window.gtag("config", measurementId');
assert.ok(bootstrapIndex >= 0 && configIndex > bootstrapIndex, "the supported wrapper must queue config");
assert.ok(loaderIndex > configIndex, "the command queue and config must be established before the remote script is inserted");
assert.match(component, /if \(!eligible \|\| !scriptLoaded \|\| typeof window\.gtag !== "function"\) return/);
assert.match(component, /window\.gtag\("event", "page_view"/);
assert.doesNotMatch(component, /\(\.\.\.args[^)]*\)\s*=>[\s\S]*?\.push\(args\)/);

console.log("GA4 transport regression checks passed.");
