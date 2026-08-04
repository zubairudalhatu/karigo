# Captain Data Safety worksheet

Source reviewed: Captain auth, application/profile, location, availability, assignments, deliveries/Rides, earnings, uploads, notifications and account deletion; Expo/native dependencies; backend contracts. Traffic uses HTTPS.

| Data type | Collected | Shared | Purpose | Requirement / processing | Deletion |
| --- | --- | --- | --- | --- | --- |
| Name | Yes | Safe assigned-work identity may be shown to customer/operations | Account and operations | Required; stored | Requestable, subject to retention |
| Phone number | Yes | Operations; not exposed publicly | Authentication and coordination | Required; stored | Requestable, subject to retention |
| Email | Yes when supplied | Transactional provider where enabled | Account/application messages | Optional; stored | Requestable |
| Profile photo | Yes when chosen | Customer/operations safe profile where enabled | Identity and review | Optional/approval-dependent; stored | Requestable |
| Precise/approximate location | Yes while permission granted and operationally required | Customer/dispatch/maps for active work | Map, availability, assignment safety | Required while online/active; latest operational points stored | Requestable, safety retention applies |
| Address/service area | Yes | Operations | Application and work eligibility | Required for approval; stored | Requestable, retention applies |
| Payment information | Earnings/settlement records, not customer card data | Finance operations | Earnings and settlement visibility | Operational; stored | Financial retention applies |
| Delivery/Ride history | Yes | Customer, partner and operations within assigned job | Work fulfilment, support and safety | Required; stored | Retention applies |
| App interactions | Yes | No advertising sharing found | Security, audit and reliability | Required operational logs | Requestable/retention applies |
| Uploaded photos/documents | Yes | Admin/review providers only | Identity, vehicle, licence and compliance review | Required by application type; stored | Requestable, regulatory retention applies |
| Device/session identifiers | Yes | Authentication infrastructure | Secure session and abuse prevention | Required; stored/rotated | Requestable/retention applies |
| Crash diagnostics | No dedicated third-party crash SDK found | No | Not currently declared | **OWNER CONFIRMATION REQUIRED** for platform telemetry | Not applicable if disabled |
| Notifications | Notification records/preferences may be stored | Approved delivery provider if enabled | Assignment and account updates | Configuration-dependent | Requestable |
| Vehicle/licence information | Yes for Ride/vehicle operation | Admin; safe vehicle summary may be shown to assigned customer | Approval, safety and operations | Required for relevant mode; stored | Regulatory/safety retention applies |
| Business details | No normal merchant profile | No | Not applicable | Not collected as Partner data | Not applicable |

The app requests foreground location only; no intentional background-location, contacts, SMS, call-log or broad-storage access was identified. **OWNER CONFIRMATION REQUIRED** for final telemetry/provider declarations.
