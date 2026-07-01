# Email Notification Impact Notes

## Current Behavior

In-app notifications remain the primary user activity feed. Email delivery stays in mock
mode and requires no frontend changes. No real email is sent.

## Events That May Send Email Later

- Account welcome and future OTP fallback
- Order creation, payment receipt, status updates, completion, and refunds
- Support ticket creation and updates
- Vendor new-order and settlement updates
- Rider payout updates
- Critical admin alerts

## User-Facing Screen Impact

- Signup/profile screens should clearly show and validate the email address when email
  confirmation becomes active.
- Order/payment/support success screens may say that a confirmation was emailed only
  after real delivery is enabled.
- In-app notifications should remain available even if email delivery fails.
- A future notification-preferences screen should let users control optional email
  channels while preserving required operational messages.

## Frontend TODOs

- Email verification flow and change-email confirmation
- Notification preference controls
- Resend receipt/confirmation actions
- Clear messaging for missing or unverified email addresses
