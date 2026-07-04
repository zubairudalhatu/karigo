# Notification QA Checklist

Use staging notifications only. Do not paste bearer tokens, OTPs, private customer data,
provider credentials, or sensitive financial data into QA evidence.

## Vendor Dashboard

| Check | Expected result | Status | Notes |
| --- | --- | --- | --- |
| Notification list loads | Vendor notifications render in the dashboard | Pending |  |
| Title is separate | Notification title appears on its own line | Fixed | Example: `Settlement paid` |
| Message is separate | Notification body appears below the title | Fixed | Example: settlement-paid order message |
| Timestamp is separate | Created date/time appears below message | Fixed |  |
| Long references wrap | Long order or payout references do not break layout | Fixed | Uses wrapping CSS |
| Read one works | Clicking unread notification marks it read | Pending | Existing behavior preserved |
| Mark all read works | Mark-all-read clears unread state | Pending | Existing behavior preserved |
| Sensitive data hidden | No delivery OTPs, payment tokens, or private payout details appear | Fixed |  |

## Cross-Surface Reminder

- Customer, Rider, Admin and Vendor notifications should keep in-app notification as the
  primary channel while mock providers remain active.
- External email, WhatsApp and push providers remain disabled unless staging explicitly
  enables approved sandbox credentials.
