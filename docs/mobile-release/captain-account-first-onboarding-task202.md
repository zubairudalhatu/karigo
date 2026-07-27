# Task 202 - Captain Account-First Onboarding

## Release Summary

KariGO Captain now supports account-first onboarding for existing KariGO Customers. A customer can sign in to the Captain app with the same phone number, email and password used for the Customer App, then submit or track a Delivery Captain or Ride Captain application.

This does not create duplicate user records and does not change the mobile package name. Captain operations remain locked until KariGO approves the linked Captain profile.

## One-Account Multi-Role Model

KariGO identity remains unique at the user-account level. Phone number and email stay unique, while role-specific capabilities are represented by linked records such as Delivery Captain applications, Rider profiles, Ride Captain readiness applications, Partner applications and Vendor/Partner profiles.

Supported account states after this task:

- Customer
- Customer plus Captain applicant
- Customer plus approved Delivery Captain
- Customer plus Ride Captain readiness applicant
- Existing Rider/Captain applicant account

Partner/Vendor access remains separate and was not weakened.

## Existing Customer to Captain Flow

1. Existing Customer opens KariGO Captain.
2. Login accepts Customer accounts for onboarding/status.
3. Dashboard shows onboarding guidance if no approved Captain profile exists.
4. Customer submits Delivery Captain or Ride Captain application from the Captain app.
5. Backend links the application to the existing user ID.
6. If an active application already exists, backend returns the existing status instead of creating a duplicate.
7. Admin review can approve the Delivery Captain application and create the approved Rider/Captain profile.

## Approved Captain Flow

Approved Delivery Captains continue to see:

- Home/dashboard availability
- Assigned deliveries
- Delivery detail workflow
- Earnings visibility
- Profile and biometric sign-in controls

Operational endpoints now require an approved active Captain/Rider profile, not only a historical base user role.

## Pending or Rejected Applications

Pending, under-review or provisionally approved applicants can sign in and view onboarding/status guidance. They cannot access delivery operations.

Rejected applicants can sign in to view status guidance and contact KariGO support/reapply only where allowed by operations.

## Play Internal Testing Note

This task changes JavaScript/TypeScript app behavior only. No native dependency, package name or EAS project setting changed. An EAS Update should be enough for internal testing unless the installed build is not receiving OTA updates reliably.

## Guardrails

- No duplicate phone/email/user account is created for existing Customers.
- Pending applicants cannot accept jobs.
- Customer-only accounts cannot access dispatch operations.
- Approved Captain operations require an active Rider/Captain profile.
- KariGO Rides remains readiness-only unless existing operations flags separately enable test dispatch.
- No payment, payout or ride live-dispatch behavior was activated.
