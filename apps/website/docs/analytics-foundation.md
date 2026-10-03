# Analytics foundation

KariGO's public website analytics integration remains disabled until all four runtime gates are satisfied: a production build, a valid `NEXT_PUBLIC_GA_MEASUREMENT_ID`, affirmative versioned analytics consent and an allowed public route. This repository does not contain a measurement ID.

The prepared implementation uses direct GA4 loading without Google Tag Manager. It disables automatic page views, Google Signals and advertising consent. Page views use the canonical origin plus a normalized pathname. Query strings, fragments and unsafe external referrers are excluded. Event names and parameters are allowlisted in `src/lib/analytics.ts`; form values are never read to construct analytics payloads.

Candidates for a later Google Analytics Key Event decision are:

- `contact_submit`, after a real authoritative backend acknowledgement exists
- `vendor_application_submit`
- `captain_application_submit`
- `sme_application_submit`
- `google_play_click`

No event is marked as a Key Event by this local preparation.
