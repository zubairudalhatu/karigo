# Vendor Application Review And Approval

Task 44 adds admin review endpoints and a basic Admin Portal review screen.

## Admin Routes

- Admin Portal: `/vendor-applications`
- `GET /api/v1/admin/vendor-applications`
- `GET /api/v1/admin/vendor-applications/review-queue`
- `GET /api/v1/admin/vendor-applications/:applicationId`
- `PATCH /api/v1/admin/vendor-applications/:applicationId`
- `POST /api/v1/admin/vendor-applications/:applicationId/request-changes`
- `POST /api/v1/admin/vendor-applications/:applicationId/provisionally-approve`
- `POST /api/v1/admin/vendor-applications/:applicationId/approve`
- `POST /api/v1/admin/vendor-applications/:applicationId/reject`

## Admin Roles

Allowed roles:

- SUPER_ADMIN
- OPERATIONS_ADMIN
- VENDOR_MANAGER

## Review Statuses

- DRAFT
- SUBMITTED
- UNDER_REVIEW
- CHANGES_REQUESTED
- PROVISIONALLY_APPROVED
- APPROVED
- REJECTED
- SUSPENDED
- WITHDRAWN

## Approval Boundary

Approval records the decision only. Manual follow-up is still required for:

- Vendor workspace account setup.
- Storefront publication.
- Payout account submission and review.
- Product/catalogue setup.
- Pharmacy review where relevant.
