# Captain background-location declaration audit

Date: 28 September 2026
App: KariGO Captain (`com.karigo.rider`)
Replacement artifact: `1.2.0` / version code `17`

## Current Play declaration

The existing declaration is marked **Ready to send for review**, last edited 22 August 2026. No field was changed or saved during this audit.

The saved video URL is `https://drive.google.com/file/d/1Vvw5hEGT8lzJ_U_ve5FZ372aixyS1A3p/view?usp=sharing`. On 28 September 2026 it returned **Page Not Found**, so it is not valid evidence.

## Exact proposed answers

### App purpose — 356/500 characters

> KariGO Captain is the driver app for approved KariGO Captains. It lets Captains go online, receive and accept Ride and Delivery assignments, navigate to pickup and destination, communicate with customers, complete assigned work, and view work and earnings. Its core purpose is to let an approved Captain safely perform assigned transport and delivery work.

### One background-location feature

Replace the current Ride-only wording with this Ride-and-Delivery description:

> After a Captain accepts a Ride or Delivery assignment, active-work tracking keeps pickup and destination progress current while the app is minimized, the screen is locked, or another navigation app is visible. It starts only after acceptance, the prominent disclosure, Continue, and location permission. It stops when work ends or is cancelled, on sign-out, or when the server no longer confirms active work.

### Video URL

No replacement URL is available. Do not save until a current code-17 recording is uploaded to an accessible URL and verified in a signed-out/private browser session.

## Prominent disclosure verification

Title:

> Location during active work

Body:

> KariGO Captain collects your location while the app is minimized or not in use during an accepted Ride or Delivery assignment. This enables live trip or delivery tracking and safety. Background tracking stops when your active assignment ends. Your location is not used for advertising. Choose Continue to allow background location, or Not now to keep working with the app open.

Buttons: **Not now** and **Continue**.

Source inspection confirms this disclosure is shown before `requestBackgroundPermissionsAsync()`. The app rechecks that work is still accepted/in progress after permission is granted and before `startLocationUpdatesAsync()`. The task fails closed and stops tracking if the server cannot confirm active work. Dashboard state stops tracking outside accepted/in-progress work, and sign-out also stops it.

## Why foreground-only access is insufficient

Captains must switch to navigation, minimize the app, or lock the screen while travelling. Foreground-only updates would stop active-work progress while another screen is visible, interrupting customer/operations visibility and the safety record for an accepted assignment.

## Data use boundary

The implementation limits background samples to accepted or in-progress Ride/Delivery work. The disclosure states that location is not used for advertising. This audit does not independently establish provider-sharing or Data Safety treatment; those items remain separately unconfirmed.

## Current state

- Declaration fields changed: **No**
- Saved: **No**
- Existing invalid URL removed: **No**
- Send for review: **No**
- Blocker: current public real-device video is missing
