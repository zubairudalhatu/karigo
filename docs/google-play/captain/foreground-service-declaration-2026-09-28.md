# Captain foreground-service declaration audit

Date: 28 September 2026  
App: KariGO Captain (`com.karigo.rider`)  
Replacement artifact: `1.2.0` / version code `17`  
SHA-256: `DC5D5F7C2F0A61D6FD47BB9E6FA1915CE2C91BFB896764142C2EE9027AC3A3E5`

## Artifact and Console reconciliation

Version code 17 legitimately declares `FOREGROUND_SERVICE_LOCATION` and uses Expo Location's location foreground service for accepted or in-progress Ride and Delivery work. It does not declare `FOREGROUND_SERVICE_MEDIA_PROJECTION`. Agora is used for audio calling; no screen capture, screen sharing, or media-projection invocation exists.

Google Play currently lists both `FOREGROUND_SERVICE_LOCATION` and `FOREGROUND_SERVICE_MEDIA_PROJECTION`. Its **View app bundles and APKs** dialog attributes the undeclared permissions solely to version code `16 (1.2.0)` in Internal testing, first published 22 August 2026. The media-projection prompt therefore belongs to an obsolete artifact, not replacement code 17.

## Exact proposed answers

For **Location → Background location updates**, select:

- **User-initiated location sharing**
- **Navigation**

Do not select **Geofencing**, either **Other** option, or any **Media projection** option.

Supporting description for the declaration/evidence record:

> After a Captain accepts a Ride or Delivery assignment, KariGO Captain uses a location foreground service to keep active-work progress current while the app is minimized, the screen is locked, or another navigation app is visible. Tracking starts only after the Captain accepts work, sees the prominent disclosure, chooses Continue, and grants location access. An ongoing notification says “KariGO Captain active Ride or Delivery” and “Location is updating while your accepted assignment is active.” Tracking stops when the assignment ends or is cancelled, the Captain signs out, the server no longer confirms active work, or the server cannot be reached.

This qualifies as user initiated because accepting an assignment starts the flow. Navigation is applicable because the Captain travels to pickup and destination while another navigation screen may be in use. It is not geofencing, continuous availability tracking, advertising, or media projection.

## Evidence still required before save

A current, publicly accessible real-device video for code 17 is required. It must show the acceptance trigger, disclosure before the Android permission UI, permission grant, ongoing foreground-service notification, minimized/background tracking during active work, and tracking/notification stopping when work ends. The currently saved Drive URL returns **Page Not Found**.

## Revealed Console fields after approved selection

On 28 September 2026, **User-initiated location sharing** and **Navigation** were selected temporarily for inspection. Play revealed the same required prompt beneath each selected task:

> Provide a video demonstrating how your app uses the FOREGROUND_SERVICE_LOCATION permission for the tasks you've selected

Each prompt contains one empty field labelled **Video link**. Play showed no additional narrative question or option for either selected task. **Geofencing**, both Location **Other** choices, **Media and content projection, streaming**, and the Media projection **Other** choice remained unchecked. **Save** remained disabled because the required video fields were empty. Nothing was saved.

## Current state

- Unsaved inspection selections currently shown: **User-initiated location sharing** and **Navigation**
- Console declaration saved: **No**
- Send for review: **No**
- Blockers: invalid video evidence and obsolete Internal-testing code 16 media-projection prompt
