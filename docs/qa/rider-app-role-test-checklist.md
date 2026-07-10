# Rider App Role Test Checklist

Use the Demo Rider account from `docs/deployment/karigo-staging-demo-accounts.md`.

| Area | Steps | Expected result | Failure signs | Tester notes |
|---|---|---|---|---|
| Launch/login | Open Rider staging APK and log in. | Rider dashboard opens for `RIDER` role only. | Wrong-role access, session expired loop, invalid API URL. | Confirm staging API URL. |
| Availability | Toggle online/offline. | Clear Go online/Go offline state. | Toggle does not persist, delivery jobs hidden while online. | Existing delivery workflow remains default. |
| Assigned jobs | Open Jobs list after admin assigns rider. | Assigned delivery job appears. | Empty list when assigned, wrong rider's job shown. | Data must be rider-scoped. |
| Job detail | Open job detail. | Pickup, delivery address, status and action buttons are clear. | Missing address, raw backend error. | No delivery OTP visible to rider. |
| Accept/reject | Accept assigned job or reject with reason where available. | Backend records rider decision. | Invalid action enabled, no feedback. | Confirm admin sees update. |
| Pickup flow | Mark arriving at pickup and picked up. | Status progresses in correct order. | Out-of-order transition accepted. | Use seeded/demo order. |
| Delivery flow | Mark on the way, arrived destination and delivered. | Customer order timeline updates. | Customer app not updated. | Coordinate with customer tester. |
| Delivery OTP/PIN | Enter customer-supplied delivery OTP to complete. | Valid OTP completes order; invalid OTP rejected. | Rider can view OTP directly, completion without OTP. | Do not record raw OTP. |
| Earnings | Open Earnings. | Total, pending and paid earnings display. | Incorrect totals or crash. | Mark-paid remains admin controlled. |
| Notifications | Open notifications. | New job/earning/status notifications are readable. | Concatenated message, sensitive info exposed. | No OTP in notifications. |
| Support | Open support if available. | Support route/state is usable or clearly unavailable. | Broken route or blank screen. | Record gap if unsupported. |
| Taxi Driver Readiness | Open Taxi Driver Readiness. | Application form and status check work. | Presents Taxi as live. | Readiness only when flags off. |
| Taxi Test Mode disabled | Keep Taxi flags off. | Taxi Test Mode is hidden or not actionable. | Driver can accept Taxi trip with flags off. | Required default. |
| Taxi Test Mode enabled | Approved staging only: enable flags and active test profile. | Driver can toggle Taxi availability and progress test trip with PIN. | Live payment/cashout/map claims. | No real ride guarantee. |
| Logout/session | Logout and reopen. | Rider returns to login; stale token cleared. | User remains logged in unexpectedly. | Retest login. |
