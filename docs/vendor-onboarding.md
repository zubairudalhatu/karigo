# Vendor Onboarding

Task 44 adds the first public vendor application workflow.

## Public Flow

- Customer App route: `/vendor/apply`.
- Status route: `/vendor/application-status`.
- Public API: `POST /api/v1/vendor-applications`.
- Status API: `GET /api/v1/vendor-applications/status`.

## Admin Flow

- Admin Portal route: `/vendor-applications`.
- Admin API: `/api/v1/admin/vendor-applications`.

Approval does not automatically:

- Create a live storefront.
- Activate products.
- Approve payout details.
- Enable pharmacy scope.
- Activate promotions.

See `docs/public-vendor-application-workflow.md` and `docs/vendor-application-review-and-approval.md`.
