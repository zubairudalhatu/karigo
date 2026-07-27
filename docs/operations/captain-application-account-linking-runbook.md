# Captain Application Account Linking Runbook

## Purpose

This runbook explains how KariGO Operations should handle Captain applications that are linked to existing Customer accounts.

## Account Model

A person should use one KariGO identity. Do not ask an existing Customer to create a second phone number, second email or separate password for Captain onboarding.

Applications should link to the existing user account by authenticated user ID wherever possible. Public phone-number status checks remain available for legacy applicant flows, but existing Customers should sign in before applying.

## Normal Operations Flow

1. Customer signs into the Captain app.
2. Customer submits Delivery Captain or Ride Captain readiness application.
3. Backend links application to existing user ID.
4. Admin reviews documents, vehicle details and guarantor details.
5. Admin may move application through review statuses.
6. On Delivery Captain approval, backend creates or links an approved Rider/Captain profile for that same user.
7. Captain operations become available only after the approved profile exists.

## Duplicate Application Handling

If a user submits another active application with the same account or phone number, the backend returns the existing application status. Operations should update/review the existing record instead of creating a new one.

## Pending and Rejected Applicants

Pending applicants can only view status/onboarding guidance. They cannot go online, accept orders, update delivery status or view operational earnings.

Rejected applicants can view status/support guidance. Reapplication should follow the current Admin decision and operations policy.

## Admin Approval Impact

Delivery Captain approval creates or links a Rider/Captain profile on the same user. The base account may still have Customer role, but operation access is granted by approved Captain profile status.

Ride Captain readiness approval remains controlled by existing ride readiness flags and does not activate public rides unless separately approved.

## Security Guardrails

- Do not merge accounts manually without confirming phone/email ownership.
- Do not expose OTPs, passwords, payment details or document secrets.
- Do not approve dispatch access before identity, documents and guarantor checks pass.
- Do not use Admin tools to create duplicate user records for the same person.

## Support Script

Recommended support response for existing Customers:

"Please sign in to KariGO Captain using your existing KariGO phone number and password. You can complete your Captain application from there without creating a new account."
