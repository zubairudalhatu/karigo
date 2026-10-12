# Customer iOS camera purpose correction

Apple received build 1.1.1 (1), then rejected it with error 90683 because
`NSCameraUsageDescription` was absent. Expo Image Picker and Agora include
camera APIs in the native binary. Customer currently selects profile photos
from the library and makes voice calls; it has no camera capture/video UI.

The owner approved this exact iOS declaration:

> KariGO may request camera access when using communication or media features that require it.

`app.config.ts` declares it and the iOS-only permission plugin preserves the
exact value after dependency plugins run. The prepared iOS build number is 2;
app/runtime version remains 1.1.1. Dependencies, Android configuration,
microphone, photo-library, foreground-location and Face ID descriptions are
unchanged. No native refactor, camera UI, permission-request call or proactive
camera prompt was added.

## Verification

- Customer typecheck and all 11 regression suites passed.
- Expo Doctor passed 18/18.
- iOS Hermes export passed; bundle `entry-50ec0d5346d4d6a0d9c6c9c5f5d4e528.hbc`
  matches the prior export. The first sandboxed export hit a temporary-file
  write denial; the export passed with the required local filesystem access.
- Changed-line secret scan and `git diff --check` passed.
- Expo config introspection ran the iOS prebuild mods; generated Info.plist
  contains the exact camera text and version/build 1.1.1 (2). All previous NS
  usage descriptions match the baseline.
- Android generated config and native mod results deep-equal the baseline.
- Source audit across Customer app/src found no `launchCameraAsync`,
  `requestCameraPermissionsAsync`, video enable or camera-preview calls.
  Ride calls explicitly use `publishCameraTrack: false`; profile selection
  calls only `launchImageLibraryAsync`. Launch, login, Home, Utilities,
  Wallet and Orders have no app-owned camera permission requests.
- This is source/config evidence, not physical iPhone verification of SDK
  internals. Confirm absence of camera prompts during the later iPhone QA.
- Windows cannot run Xcode/iOS native compilation. Configuration mods are
  validated here; final archived Info.plist and signing must be checked in
  the separately approved replacement native build.

No replacement build/upload, App Review submission or public release is
authorized by this preparation gate. Export-compliance classification remains
separate and unresolved. Utilities, Paybeta/GOtv, APNs, signing and AdMob were
not changed.
