# Captain background-location and location-FGS video runbook

Date: 28 September 2026  
Target: KariGO Captain code 17 from the Play testing track on a physical Android device

## Preconditions

- Install code 17 from Google Play on a clean physical device.
- Use the dedicated non-personal reviewer account; do not show its password.
- Prepare a real Ride or Delivery assignment that can be accepted and completed/cancelled safely.
- Start with background location not yet granted so the disclosure and Android permission flow can be recorded.
- Enable screen recording and keep the status bar/notification shade visible when required.

## Recording script

1. Show the Play-installed app version as code 17 if the device UI exposes it.
2. Sign in without exposing credentials.
3. Show that no active assignment exists and no KariGO active-work location notification is present.
4. Receive and accept a Ride or Delivery assignment.
5. Show the in-app disclosure before any Android background-location permission UI:
   - title: **Location during active work**
   - the full disclosure text, including minimized/not-in-use collection, active assignment purpose, stop condition, no advertising, and the choice to continue or decline
   - **Not now** and **Continue** buttons
6. Tap **Continue** and show the Android location-permission flow. Do not edit permissions outside the flow except where Android requires the Settings screen for “Allow all the time.”
7. Return to the active assignment. Pull down the notification shade and show:
   - **KariGO Captain active Ride or Delivery**
   - **Location is updating while your accepted assignment is active.**
8. Minimize KariGO Captain or switch to navigation. Move the device through a short safe route or use a controlled test route. Show that active-work progress continues while KariGO is not the visible app.
9. Return to KariGO Captain and show the updated active assignment.
10. Complete or cancel the assignment through the legitimate test flow.
11. Pull down the notification shade and show that the KariGO active-work location notification has stopped.
12. If practical, show that remaining online without accepted/in-progress work does not restart background tracking.

## Capture requirements

- One continuous recording is preferred; keep it concise while showing every required transition.
- Do not expose customer addresses, phone numbers, private messages, passwords, OTPs, payment data, or unrelated notifications.
- The recording must show the real app UI and Android permission/notification UI. Narration or captions may clarify actions but cannot replace visible evidence.
- The video must match code 17 behavior and the declaration text.
- Upload to YouTube as unlisted or another Google-accepted public URL. Verify access while signed out or in a private browser window before entering the URL in Play Console.
- Record the final URL, recording date, device/Android version, app version/code, and tester in the secure compliance evidence register. Do not store reviewer credentials in the repository.

## Pass criteria

- Disclosure visibly precedes the Android permission UI.
- Tracking starts only after accepted work and explicit continuation.
- The ongoing notification is visible during background tracking.
- Tracking continues while minimized or using navigation.
- Tracking and its notification stop when active work ends.
- The URL is accessible to Google reviewers without sign-in, OTP, MFA, or an access request.
