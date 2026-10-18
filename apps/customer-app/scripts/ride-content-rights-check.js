const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");
const source = fs.readFileSync(path.join(__dirname, "../app/taxi/request.tsx"), "utf8");
const savedCode = source.slice(source.indexOf("function placeFromAddress("), source.indexOf("function coordinateFromUnknown("));
const savedSandbox = { module: { exports: {} }, exports: {} };
vm.runInNewContext(ts.transpileModule(`${savedCode}\nmodule.exports = placeFromAddress;`, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, savedSandbox);
for (const contentSource of [undefined, "LEGACY_UNKNOWN", "GOOGLE_DERIVED", "USER_SUPPLIED"]) {
  const place = savedSandbox.module.exports({ label: "Synthetic saved", addressLine: "Synthetic street", city: "Kano", latitude: 12, longitude: 8, contentSource });
  assert.equal(place.latitude, contentSource === "USER_SUPPLIED" ? 12 : undefined);
  assert.equal(place.contentSource, contentSource ?? "LEGACY_UNKNOWN");
}
// Exercise the actual selection handler: unknown/Google saved locations cannot reach preview/booking.
const applyCode = source.slice(source.indexOf("  function applyPlace("), source.indexOf("  async function selectPrediction("));
const calls = [];
const applySandbox = { module: { exports: {} }, exports: {}, Keyboard: { dismiss() {} }, pickup: null, destination: null, stop: null, hasCoordinate: p => Boolean(p?.latitude), previewAndEstimateRoute: () => calls.push(["preview"]) };
for (const name of ["setActiveField", "setPickup", "setPickupText", "setStop", "setStopText", "setDestination", "setDestinationText", "clearRouteState", "setSuggestions", "setStep", "setPanelState", "setError", "setGoogleAttributionRequired"]) applySandbox[name] = value => calls.push([name, value]);
vm.runInNewContext(ts.transpileModule(`${applyCode}\nmodule.exports = applyPlace;`, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, applySandbox);
applySandbox.module.exports("destination", { source: "saved", contentSource: "LEGACY_UNKNOWN", latitude: 12, longitude: 8, address: "Synthetic" }, true);
assert(calls.some(([name, value]) => name === "setDestination" && value === null));
assert(calls.some(([name, value]) => name === "setError" && value.includes("Reselect")));
assert(!calls.some(([name]) => name === "preview"));
calls.length = 0;
applySandbox.module.exports("destination", { source: "search", contentSource: "GOOGLE_DERIVED", contentProof: "synthetic", latitude: 12, longitude: 8, address: "Fresh selection" });
assert(calls.some(([name, value]) => name === "setDestination" && value.contentSource === "GOOGLE_DERIVED" && value.contentProof === "synthetic"));
// Execute the actual presentation component with a tiny JSX runtime. No device, network or credentials.
const component = source.slice(source.indexOf("const RideMap = forwardRef"));
const compiled = ts.transpileModule(`${component}\nmodule.exports = RideMap;`, {
  compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS }
}).outputText;
function render(platform) {
  const jsx = (type, props) => ({ type, props });
  const sandbox = {
    module: { exports: {} }, exports: {},
    require: () => ({ jsx, jsxs: jsx }),
    forwardRef: (render) => render,
    Platform: { OS: platform }, View: "View", Text: "Text", MapView: "NativeMap"
  };
  vm.runInNewContext(compiled, sandbox);
  return sandbox.module.exports({ children: "GOOGLE_MARKER_AND_POLYLINE", style: {} }, null);
}
// Exercise the actual Recent Destinations mapping: provenance must survive selection.
const recentStart = source.indexOf("  const recentPlaces = useMemo(() => {") + "  const recentPlaces = useMemo(() => {".length;
const recentEnd = source.indexOf("  }, [trips]);", recentStart);
assert(recentStart > 0 && recentEnd > recentStart);
const recentCode = ts.transpileModule(`function mapRecents(trips) { ${source.slice(recentStart, recentEnd)} } module.exports = mapRecents;`, {
  compilerOptions: { module: ts.ModuleKind.CommonJS }
}).outputText;
const recentSandbox = { module: { exports: {} }, exports: {}, coordinateFromUnknown: Number };
vm.runInNewContext(recentCode, recentSandbox);
const recents = recentSandbox.module.exports([
  { destinationContentSource: "USER_SUPPLIED", destinationAddress: "Synthetic user address", destinationLatitude: 9.1, destinationLongitude: 7.2 },
  { destinationContentSource: "GOOGLE_DERIVED", destinationAddress: "Synthetic provider result", destinationLatitude: 9.2, destinationLongitude: 7.3 },
  { destinationContentSource: "LEGACY_UNKNOWN", destinationAddress: "Synthetic unknown", destinationLatitude: 9.3, destinationLongitude: 7.4 }
]);
assert.equal(recents.length, 1);
assert.equal(recents[0].contentSource, "USER_SUPPLIED");
assert.equal(recents[0].source, "recent");
assert.equal(recents[0].latitude, 9.1);
assert(source.includes('fontSize: 12, fontWeight: "400"'), "Google attribution must meet the documented text minimum");
const ios = render("ios");
assert.equal(ios.type, "View");
assert(!JSON.stringify(ios).includes("GOOGLE_MARKER_AND_POLYLINE"));
const android = render("android");
assert.equal(android.type, "NativeMap");
assert.equal(android.props.children, "GOOGLE_MARKER_AND_POLYLINE");
assert(source.includes('trip.destinationContentSource === "USER_SUPPLIED"'), "Unknown/Google recent destinations must not be reused");
assert(source.includes('routeContentSource: "GOOGLE_DERIVED"'));
assert(source.includes('destinationContentProof: destination.contentProof'));
assert(source.includes("Route estimate: Google Maps"));
console.log("PASS: iOS map-free rendering, Android map preservation, provenance payload, attribution and recent-destination guard");
