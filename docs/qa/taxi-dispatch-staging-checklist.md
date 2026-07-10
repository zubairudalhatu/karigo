# Taxi Dispatch Staging QA Checklist

Use this checklist only in staging. Do not run public Taxi booking tests against production.

## Environment

- [ ] `TAXI_SERVICE_ENABLED=false` by default.
- [ ] `TAXI_STAGING_DISPATCH_ENABLED=false` by default.
- [ ] Customer app public Taxi flags default to false.
- [ ] Rider app public Taxi flags default to false.
- [ ] No live payment provider enabled.
- [ ] No maps/geocoding provider enabled.
- [ ] No emergency/SOS provider enabled.

## Disabled Mode

- [ ] Customer home shows Taxi as coming soon unless staging flags are enabled.
- [ ] Customer Taxi route sends users to waitlist/readiness when disabled.
- [ ] Rider app shows Taxi Driver Readiness only when disabled.
- [ ] Admin can see applications and waitlist records.
- [ ] Customer trip creation is blocked.
- [ ] Rider staging trip endpoints are blocked.

## Customer Test Trip Flow

- [ ] Enable staging Taxi flags in staging only.
- [ ] Customer opens `Request Test Taxi`.
- [ ] Customer enters pickup and destination.
- [ ] Customer requests fare estimate.
- [ ] Fare estimate uses server response.
- [ ] Test-mode notice is visible.
- [ ] No payment button appears.
- [ ] Customer confirms test trip.
- [ ] Trip reference is displayed.
- [ ] Trip PIN is displayed only to the customer after creation.
- [ ] Customer trip history loads.
- [ ] Customer can view only their own trips.

## Rider Test Mode Flow

- [ ] Rider has approved `ACTIVE_TEST` Taxi driver profile.
- [ ] Rider can toggle Taxi Test Mode availability.
- [ ] Available test trips load only when rider is available.
- [ ] Rider can accept a requested test trip.
- [ ] Rider cannot accept another active test trip.
- [ ] Rider marks arrived at pickup.
- [ ] Rider cannot start without the correct customer PIN.
- [ ] Rider starts trip with correct PIN.
- [ ] Rider marks arrived at destination.
- [ ] Rider completes trip.
- [ ] Existing delivery jobs remain unaffected.

## Admin Flow

- [ ] Admin Taxi page shows Driver Applications tab.
- [ ] Admin Taxi page shows Customer Waitlist tab.
- [ ] Admin Taxi page shows Driver Profiles tab.
- [ ] Admin Taxi page shows Test Taxi Trips tab.
- [ ] Admin Taxi page shows Taxi Summary tab.
- [ ] Admin can create a test driver profile from an approved application.
- [ ] Admin can set test driver profile status.
- [ ] Admin can manually assign an available test driver.
- [ ] Admin can cancel a test trip.
- [ ] Admin sees event timeline.
- [ ] Admin does not see raw trip PIN.
- [ ] Admin sees no live payment, maps billing or real dispatch action.

## API Regression

- [ ] Public fare estimate works when staging flags are enabled.
- [ ] Customer fare estimate works for authenticated customer.
- [ ] Customer trip request is blocked when flags are disabled.
- [ ] Trip reference is unique.
- [ ] Raw PIN is not stored.
- [ ] Approved test driver can accept.
- [ ] Unapproved driver cannot accept.
- [ ] Driver cannot start without correct PIN.
- [ ] Customer cannot access another customer's trip.
- [ ] Admin can assign driver.
- [ ] Admin can cancel trip.
- [ ] Trip events are created.

## Evidence

Record only non-sensitive evidence:

- Test date:
- Environment:
- Tester:
- Customer persona:
- Rider persona:
- Admin persona:
- Trip reference:
- Result:
- Issues found:
- Retest result:

Do not record real phone numbers, raw PIN values, provider credentials, screenshots containing secrets or live customer data.
