# Bills & Utilities Staging Checklist

## Backend

- [ ] Prisma migration deployed.
- [ ] Prisma seed run idempotently.
- [ ] Demo utility providers exist.
- [ ] Demo utility products exist.
- [ ] `GET /api/v1/utilities/providers` returns active providers only.
- [ ] `GET /api/v1/utilities/products` returns active products only.
- [ ] Customer quote validates provider, product, amount and recipient.
- [ ] Mock airtime transaction succeeds.
- [ ] Mock data transaction succeeds.
- [ ] Mock electricity transaction returns fictional token.
- [ ] Mock cable TV transaction succeeds.
- [ ] Amount `99999` kobo fails safely.
- [ ] Customer cannot access another customer's utility transaction.
- [ ] Admin list masks recipient values.
- [ ] Admin status override is admin-only and staging-safe.

## Customer App

- [ ] Bills & Utilities screen opens from homepage tiles.
- [ ] Airtime test transaction flow works.
- [ ] Data test transaction flow works.
- [ ] Electricity test transaction flow works.
- [ ] Cable TV test transaction flow works.
- [ ] Confirm button says `Run Test Transaction`.
- [ ] Receipt shows reference, provider, service, amount, status and timestamp.
- [ ] Electricity receipt shows a fictional mock token only.
- [ ] Safety copy explains no real utility will be delivered.
- [ ] Utility history is separate from delivery orders.
- [ ] No `Pay Now` wording appears in utility flows.

## Admin Portal

- [ ] Utilities sidebar item appears.
- [ ] Summary cards load.
- [ ] Transaction table loads.
- [ ] Filters work for service type and status.
- [ ] Detail panel opens.
- [ ] Recipient value is masked.
- [ ] Staging admin override requires confirmation.
- [ ] No real fulfilment action is shown.

## Provider Readiness

- [ ] No live provider credentials are committed.
- [ ] Mock provider remains active.
- [ ] Future provider integration checklist is reviewed.
- [ ] Reconciliation process is documented before live launch.
- [ ] Fraud and limit controls are documented before live launch.
