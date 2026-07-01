# Private Staging Demo Account Register

Do not record real passwords, real phone numbers, personal email addresses, or production
credentials in this file. Temporary credentials must be shared through a secure handover
method outside Git.

| Persona | Login identifier placeholder | Role | Purpose | Account status | Password reset required | Owner |
| --- | --- | --- | --- | --- | --- | --- |
| Super Admin | `<staging-super-admin-login>` | Admin / Super Admin | Platform control, reports, settlements, support oversight | Pending provisioning | Yes | Technical/Management Lead |
| Operations Admin | `<staging-operations-admin-login>` | Admin / Operations | Dispatch, support, day-to-day operations rehearsal | Pending provisioning | Yes | Operations Lead |
| Demo Customer | `<staging-customer-login>` | Customer | Customer app order, support, refund, notification testing | Pending provisioning | Yes | QA/Product |
| Demo Vendor Owner | `<staging-vendor-owner-login>` | Vendor | Vendor dashboard order acceptance/preparation testing | Pending provisioning | Yes | Vendor Ops |
| Demo Vendor | `<staging-demo-vendor-record>` | Vendor business | Active vendor, menu/products, order visibility | Pending provisioning | N/A | Vendor Ops |
| Demo Rider | `<staging-rider-login>` | Rider | Rider job acceptance, delivery status, OTP completion testing | Pending provisioning | Yes | Dispatch/Rider Ops |
| Support Officer | `<staging-support-login>` | Admin / Support if supported | Ticket triage and customer-visible response testing | Optional / Pending | Yes | Support Lead |
| Finance Officer | `<staging-finance-login>` | Admin / Finance if supported | Refund and settlement review testing | Optional / Pending | Yes | Finance Lead |

## Current Account Status

The seed script can create synthetic local/demo personas, but actual private staging
accounts have not been provisioned because the staging database and secret handover path
are not available in this workspace.
