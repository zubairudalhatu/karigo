# Captain background-location recording checklist — Task 209B-S1-H11.2D

Status: REQUIRED; not yet recorded or verified. On 27 September 2026 the existing Drive URL in Play Console returned "file you have requested does not exist". Do not reuse that link or submit a placeholder.

## Before recording

- Install the exact candidate Android binary containing the disclosure and accepted-work lifecycle corrections. Record package com.karigo.rider, version name/code, build ID, commit and Android version in the private evidence record.
- Use dedicated non-personal Captain and Customer review accounts with controlled data. Do not show credentials, OTPs, private addresses or real customer journeys.
- Use a safe controlled assignment. Never operate the recording device while driving. No live fare, payment, dispatch to unrelated people or financial settlement is needed for the demonstration.
- Start with background permission not granted, an approved Captain signed in, and no active assignment. Allow normal foreground location when prompted. Verify the recording URL is accessible without sign-in or an access request.

## Exact walkthrough and narration

1. **Go online:** Show Captain dashboard, choose Ride, and explicitly go online. Narrate: "The Captain chooses to go online. Background tracking has not started merely because an offer is available."
2. **Accept:** Show the controlled Ride offer and tap Accept. Keep the resulting disclosure readable on screen. Narrate: "Background location supports live tracking and safety during accepted work."
3. **Disclosure before permission:** Show the complete "Location during active work" disclosure before touching Continue. It must state location collection when minimized/not in use, Ride/Delivery purpose, end-of-assignment stop, and no advertising use. Do not edit out the ordering.
4. **Permission:** Tap Continue and show the Android background-location permission/settings flow. Select the appropriate allowed access and return to the app. Show that declining is possible; capture the decline branch separately if needed.
5. **Active tracking:** Show pickup/active Ride state and the ongoing "KariGO Captain active Ride or Delivery" notification. Narrate: "Tracking is associated with this accepted assignment."
6. **Minimize:** Press Home or switch to navigation. Keep the app minimized long enough to show a new timestamp/location update on the controlled Customer tracking view or secure operations evidence. Show a safe controlled change, not fabricated GPS evidence. Do not expose unrelated records.
7. **End:** Return to Captain, finish the controlled assignment using its ordinary completion flow, and show no active work. Show that the tracking notification disappears and no further background location updates occur when minimized. Capture cancellation/end and sign-out stop behavior in supporting QA evidence.

Aim for Google's recommended short demonstration (about 30 seconds) with clearly labeled cuts for waiting periods. If that hides permission ordering or tracking evidence, use a longer readable recording and retain the complete uncut evidence. The Play declaration should describe one principal feature: active Ride tracking. Supporting QA should separately verify Delivery tracking, which shares the implementation.

## Acceptance evidence

- Prominent disclosure occurs before OS background permission request.
- Offered/unaccepted work and idle online status do not start background updates.
- Accepted Ride and Delivery work can update while minimized; notification is perceptible.
- Decline/deny does not start background updates or repeatedly force the permission prompt.
- Work ending during disclosure, permission prompt, or native startup cannot leave tracking running.
- Completed/cancelled work and logout stop tracking. Record remote-end/offline behavior and any delay; do not claim immediate remote termination without device evidence.
- Recording matches the submitted binary, is current, and opens signed out.
- Replace the invalid URL in Location permissions and supply the verified demonstration for the location foreground-service declaration. Do not claim screen projection; it is not a KariGO feature.

Policy: https://support.google.com/googleplay/android-developer/answer/9799150
FGS: https://support.google.com/googleplay/android-developer/answer/13392821
