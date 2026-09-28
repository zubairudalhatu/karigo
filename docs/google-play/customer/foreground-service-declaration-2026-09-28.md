# Customer foreground-service declaration audit

Date: 28 September 2026  
App: KariGO Customer (`com.karigo.customer`)  
Replacement artifact: `1.1.0` / version code `18`  
SHA-256: `7B99804549AC3887D88AD1103F3CC97A8FDA2AB7547B620A3C53FA16D0FFD8CA`

## Finding

Version code 18 does not declare `FOREGROUND_SERVICE_MEDIA_PROJECTION`, `FOREGROUND_SERVICE_LOCATION`, or `ACCESS_BACKGROUND_LOCATION`. It retains the generic `FOREGROUND_SERVICE` permission and dependency service declarations from Expo Location and Agora, but KariGO Customer does not start a location foreground service, background location task, screen capture, screen sharing, or media projection. Customer location use is foreground-only and user initiated. Agora is used for audio calling only.

Google Play currently asks for `FOREGROUND_SERVICE_MEDIA_PROJECTION` and offers only **Media and content projection, streaming** or **Other**. The Console's **View app bundles and APKs** dialog attributes that prompt solely to version code `17 (1.1.0)` in Internal testing, first published 22 August 2026. This is an older artifact; it is not version code 18.

## Proposed declaration

No media-projection task is truthful for KariGO Customer. Do not select either Console option and do not fabricate a use case or video.

The compliant resolution is to retire or replace the obsolete Internal-testing code 17 artifact after code 18 testing is complete, then confirm that the media-projection prompt clears. Version code 18 already blocks `android.permission.FOREGROUND_SERVICE_MEDIA_PROJECTION`. The remaining generic `FOREGROUND_SERVICE` permission should also be removed from a later Customer build if manifest testing proves that no required dependency needs it; that cleanup is separate from the current false media-projection prompt.

## Current state

- Console answers changed: **No**
- Console declaration saved: **No**
- Send for review: **No**
- Video: **Not applicable**
- Blocker: obsolete Internal-testing code 17 still triggers the prompt
