# Quick Launch controlled production

Quick Launch is the normal Operations interface for a single controlled Kano or Abuja live-transaction test. It orchestrates the existing Task 209A/209B launch configuration, controlled supply, controlled Customer, checklist, drill, event and Admin audit records. The advanced Production Launch tabs remain available and unchanged.

## Safety boundary

- Quick Launch can set only one selected city/service to `OPERATIONS_ONLY` or return it to `OFF`.
- It never selects `INVITE_ONLY`, `LIMITED_PUBLIC` or `CITY_WIDE`.
- It preserves configured operating hours and sets maximum concurrent and maximum unassigned demand to one.
- It never starts automatic Ride matching, automatic payouts, public cohorts, a live transaction, or a mobile release.
- Returning a service `OFF` blocks new demand and does not cancel active work.
- Controlled records and audit history are retained after pass, failure or stop.
- Human-owned checklist evidence remains required. Quick Launch completes only checks it can prove from the selected accounts, active controlled group and capacity configuration.

Accelerate status for initial launch: **Provider network access configured — production transaction verification pending**. Airtime, Data, Electricity and Cable TV vending/reconciliation are verified separately.

## First Kano Ride test

1. Deploy the backend and Admin Portal commit. This change adds no Prisma schema migration.
2. In Admin Portal, open **Production Launch → Checklist**, choose **KANO / RIDES**, and complete or validly waive the human-owned safety checks. Do not mark evidence that has not been verified.
3. Ask the approved Ride Captain to open the Captain app and refresh GPS. Confirm the Captain has no Ride or Delivery assignment.
4. Open **Production Launch → Quick Launch** and choose **Kano** and **Rides**.
5. Search for the Operations Customer and Ride Captain by name, phone number or KariGO code. Both must display **READY**.
6. Enter the owner-approved operational reason and select **Review controlled test**.
7. Confirm that only Kano/Rides will change, capacity is 1/1, and operating hours are preserved. Select the confirmation checkbox and click **Start Controlled Test**.
8. Create the Ride from the selected controlled Customer account. Assignment remains an Operations-controlled action; Quick Launch does not enable automatic matching.
9. Check each guided step only after its evidence is visible. Never paste the Ride PIN, credentials or private evidence URLs into notes.
10. When all steps pass, choose whether Kano/Rides should remain `OPERATIONS_ONLY` for another scheduled test or return `OFF`, then select **Pass Test**.
11. If any step cannot continue, record the reason and select **Stop Test / Return Service OFF**. Safely finish any already-active Ride; no new Ride demand will be admitted.
12. Review the Drills, History and Controlled audit views and record any incident/support follow-up required by the existing runbook.

Normal Quick Launch operation does not require Render Shell, Prisma queries, or copying Customer, Captain, Partner or Vendor UUIDs.
