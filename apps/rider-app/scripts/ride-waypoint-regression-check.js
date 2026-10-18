const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const assert = require("node:assert/strict");
const ts = require("typescript");
const source = fs.readFileSync(path.join(__dirname, "../src/components/captain-ride-workspace.tsx"), "utf8");
const jsx = (type, props) => ({ type, props });
const urls = [];
const mocks = {
  "react/jsx-runtime": { jsx, jsxs: jsx },
  "@karigo/config": { brand: { colors: {} } },
  "@karigo/shared-types": { formatKobo: () => "synthetic fare" },
  "@expo/vector-icons": { Feather: "Feather" },
  "react-native": { Platform: { OS: "ios" }, View: "View", Text: "Text", Pressable: "Pressable", Linking: { openURL: url => urls.push(url) }, StyleSheet: { create: x => x } },
  "react-native-maps": { default: "NativeMap", Marker: "Marker" },
  "react": { useState: x => [x, () => {}], useRef: () => ({ current: null }), useEffect: () => {} },
  "expo-router": { router: {} },
  "./ui": { Button: "Button", Field: "Field", Message: "Message", StatusBadge: "StatusBadge", ui: {} },
  "../lib/ride-alert-state": { useRideUnreadCount: () => 0 }
};
const context = { module: { exports: {} }, exports: {}, require: name => mocks[name] ?? {} };
context.exports = context.module.exports;
vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS } }).outputText, context);
const render = stop => context.module.exports.CaptainRideWorkspace({ trip: { id: "synthetic", status: "STARTED", pickupLatitude: null, pickupLongitude: null, destinationLatitude: null, destinationLongitude: null, ...stop }, captainLocation: null, operatingArea: "Synthetic", onUpdated: async () => {} });
function nodes(value) {
  if (Array.isArray(value)) return value.flatMap(nodes);
  if (!value || typeof value !== "object") return [];
  return [value, ...nodes(value.props?.children)];
}
const tree = render({ stopContentSource: "GOOGLE_DERIVED", stopLatitude: 12.01, stopLongitude: 8.55 });
const button = nodes(tree).find(n => n.type === "Button" && n.props.title === "NAVIGATE TO STOP");
assert(button, "Captain must receive an actionable active-trip waypoint");
button.props.onPress();
assert.equal(urls[0], "https://www.google.com/maps/dir/?api=1&destination=12.01,8.55");
assert(nodes(tree).some(n => n.type === "Text" && n.props.children === "Google Maps"));
assert(!nodes(tree).some(n => n.type === "Marker" && n.props.coordinate?.latitude === 12.01), "Stop must not be placed on an Apple map");
assert(!nodes(render({ stopContentSource: "GOOGLE_DERIVED", stopLatitude: null, stopLongitude: null })).some(n => n.type === "Button" && n.props.title === "NAVIGATE TO STOP"));
assert(nodes(render({ stopContentSource: "USER_SUPPLIED", stopLatitude: 12.01, stopLongitude: 8.55 })).some(n => n.type === "Button" && n.props.title === "NAVIGATE TO STOP"));
assert(!nodes(render({ pickupContentSource: "GOOGLE_DERIVED", pickupLatitude: 12, pickupLongitude: 8 })).some(n => n.type === "NativeMap"), "Google Ride content must not be combined with Apple Maps");
mocks["react-native"].Platform.OS = "android";
assert(nodes(render({ pickupContentSource: "GOOGLE_DERIVED", pickupLatitude: 12, pickupLongitude: 8 })).some(n => n.type === "NativeMap"), "Android map behavior must remain intact");
console.log("PASS: Captain active stop navigation, Google attribution, no stop map overlay, disposed waypoint absent, USER_SUPPLIED preserved");
