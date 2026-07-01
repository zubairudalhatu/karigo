# Email Notification Sandbox Test Notes

## User Actions And Intended Email Events

- Customer registration: welcome email, once explicitly wired
- Order creation and payment confirmation
- Order status and completion updates
- Refund request and approval
- Support ticket creation and customer-visible updates
- Vendor new-order and settlement updates
- Rider earning-paid updates

Several templates and EMAIL mappings exist, but application workflows currently prioritize
in-app notifications and do not automatically fan out every event to email.

## UI Guidance

- Do not promise that an email was sent until provider delivery is enabled and accepted.
- Show in-app order/payment/support state as the source of truth.
- Email may be delayed; users should refresh the relevant screen before retrying actions.
- If an expected message does not arrive, advise checking the entered address and contacting
  KariGO Support through the in-app support flow.
- Do not expose provider errors, recipient details, or delivery metadata in the UI.

No frontend code change is required for mock mode. Future work includes verified/change-
email flows, resend-receipt actions, preferences, and approved delivery-status messaging.

## Mock Rollback

With `EMAIL_PROVIDER=mock`, provider acceptance is logged safely and no email is delivered.
Mock acceptance must never be presented to users or testers as inbox delivery evidence.
