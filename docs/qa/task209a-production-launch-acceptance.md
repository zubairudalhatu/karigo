# Task 209A Production Launch Acceptance

## Backend

- [ ] Migration replays on a clean database and applies after current production migrations.
- [ ] Missing configuration resolves OFF.
- [ ] City/service, zone, dates and Africa/Lagos hours resolve correctly.
- [ ] Operations-only and invite-only reject non-members without cohort disclosure.
- [ ] Limited/public stages enforce configured capacity.
- [ ] Pause blocks new activity and preserves active Ride/order/service records.
- [ ] Stage change requires reason/confirmation; CITY_WIDE/PAUSED require second confirmation.
- [ ] History records previous/new values, Admin and time.
- [ ] Incident pause works and incident resolution does not resume.
- [ ] Daily JSON and CSV reports contain no personal data.
- [ ] Non-admin and unapproved Admin roles receive 403.

## Admin

- [ ] Command Centre separates Kano and Abuja.
- [ ] Config, readiness, supply, cohorts, incidents, support, drills, reports and history render loading/empty/error states.
- [ ] Readiness waiver requires reason and future expiry.
- [ ] Cohort maximum and active-Customer checks work.
- [ ] Supply and capacity values are internal only.
- [ ] CSV download works through authenticated BFF.

## Customer

- [ ] OFF, Operations-only, invite member/non-member, limited, capacity, closed hours and paused states show safe copy.
- [ ] Home refreshes on foreground without clearing session on temporary API failure.
- [ ] Existing active transaction remains accessible after pause.

## Captain and Partner

- [ ] Approved controlled Captain can use enabled mode; inactive/paused mode cannot go newly online.
- [ ] GPS stability and dual-mode work lock remain intact.
- [ ] Active assignment remains manageable during pause.
- [ ] Partner catalogue/history remains accessible during pause and new Customer activity is server-blocked.

## Release decision

Backend acceptance:
Admin acceptance:
Operations acceptance:
Security/privacy acceptance:
Final stage decision (manual):
Approver and timestamp:

\n