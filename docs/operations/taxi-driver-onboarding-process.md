# Taxi Driver Onboarding Process

This process is for readiness review only. It prepares prospective taxi driver records before KariGO decides whether to launch Taxi operations.

## 1. Application Intake

- Prospective driver submits a Taxi driver readiness application.
- Required details are name, phone number, city and state.
- Optional readiness details include email, address, driver licence number, licence expiry, vehicle details, plate number, vehicle type, ownership type and notes.
- KariGO must not promise live taxi access at this stage.

## 2. Initial Admin Review

Admin reviewer checks:

- Applicant name and contact details.
- Nigerian phone number validity.
- Operating city/area.
- Vehicle ownership and vehicle type.
- Plate number and licence details where supplied.
- Completeness of information.

Recommended status:

- `UNDER_REVIEW`

## 3. Information Gap Handling

If details are missing or unclear:

- Set status to `CHANGES_REQUESTED`.
- Add an applicant-visible note with the required next step.
- Add internal admin notes only where needed.

Do not send internal notes to customers, riders or public channels.

## 4. Provisional Readiness Approval

If the application looks suitable but Taxi is not live:

- Set status to `PROVISIONALLY_APPROVED`.
- Explain that Taxi dispatch is not active yet.
- Keep the applicant in the readiness pool for later pilot planning.

## 5. Approval Or Rejection

- `APPROVED` means approved for Taxi readiness only.
- `REJECTED` means the applicant is not suitable at this time.
- Neither status activates taxi dispatch, ride matching or taxi earnings.

## 6. Customer Waitlist Follow-Up

Customer waitlist statuses:

- `SUBMITTED`: initial waitlist request.
- `CONTACTED`: KariGO reached out.
- `INTERESTED`: customer remains interested.
- `NOT_INTERESTED`: customer no longer wants Taxi updates.
- `CONVERTED`: customer moved into an approved Taxi pilot list after future launch approval.

## 7. Required Future Work Before Taxi Launch

- Legal and safety approval.
- Driver agreement.
- Vehicle inspection process.
- Licence verification process.
- Fare control and commission model.
- Maps/GPS and dispatch architecture.
- Ride lifecycle and cancellation policy.
- Customer/rider support escalation.
- Incident response and SOS plan.
- Taxi payment and payout approval.

## 8. Guardrails

- Do not activate live Taxi mode from readiness approval.
- Do not manually create ride jobs from readiness records.
- Do not collect taxi payments through readiness forms.
- Do not expose private driver records outside approved admin users.
- Keep audit logs for admin review actions.
