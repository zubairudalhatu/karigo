# Captain iOS Build 2 native diagnostic preparation

This is a diagnostic patch, not a proven background-delivery fix. No build, OTA,
fixture, or Production change is performed by these scripts.

## Reproducible installation

Root `postinstall` and Captain's EAS post-install hook run `apply.cjs`. Both are
no-ops unless `CAPTAIN_IOS_NATIVE_QA=1`. The dedicated iOS EAS profile sets that
flag and `EXPO_USE_SOURCE=1`, so CocoaPods compiles the instrumented sources.
Exact npm package versions and before/after SHA-256 hashes are required. All
inputs are validated before writing. Reapplication is idempotent; mismatched
sources fail closed. No package upgrade or manual node_modules edit is needed.

The source payloads are compiled by EXTaskManager's existing `**/*.{h,m}` glob.
ExpoLocation discovers the recorder dynamically; no circular pod dependency is
introduced. Existing ExpoTaskManager exports arm/read/clear, avoiding a second
native module identity.

## Native evidence

Explicitly arm from the existing authenticated, build-flagged location QA page.
Native capture is off by default, with at most 64 entries and a 30-minute expiry.
Every native write/read checks expiry. Expired entries are removed on access;
no idle background timer or tracking is added. The serialized native ring uses
an atomic device-local file protected until first unlock after reboot.

Allowed data: timestamp, fixed stage/reason, counts, coarse distance bucket,
elapsed sample seconds, booleans and numeric native error code. No coordinates,
identifiers, phone/Customer data, tokens, payloads or free-form error text.
Storage/write failure must never authorize tracking or change availability.

The stages cover native Core Location delivery, native batching, consumer
execution, TaskManager lookup/queue/execute, headless loading, native event
emission and native completion acknowledgement. TASK_COMPLETE means the native
completion acknowledgement arrived, not that the application upload succeeded.
Use the existing JS/backend evidence to verify that separately.

## Diagnostic batching

While the native ring is armed, only the named Captain active-work consumer
uses an effective native batching gate of 0 metres / 0 milliseconds. The saved
TaskManager options are deliberately unchanged (100m/60s); native BATCH_GATE
reports `diagnosticDeferral=true`. Clearing or expiry immediately restores the
normal gate on the next callback. Balanced accuracy, AutomotiveNavigation,
50m distance filter, explicit iOS auto-pause=false and background indicator are
unchanged. No idle location task is started by any diagnostic operation.

## Compatibility boundary

Dedicated profile: `captain-ios-build2-diagnostic`; app 1.2.0, iOS build 2,
iOS runtime `1.2.0-captain-nativeqa2`, channel `captain-ios-native-qa`.
Build 1 runtime 1.2.0 cannot receive updates requiring these native APIs.
Android keeps its existing runtime/config and optional-native access is disabled
there. The diagnostic profile refuses an Android EAS platform selection.

The existing certificate, provisioning profile and APNs credentials are reused;
none is created or rotated by this change.

## Validation boundary

Windows validates deterministic patching, native source structure, generated
project/config, autolinking, TS, mocked permission/buffer state machines and
Hermes/module identity. CocoaPods dependency resolution, Objective-C compilation,
linking and signed-IPA reinspection remain EAS compilation gates. A native
physical callback PASS is never inferred from these checks.
