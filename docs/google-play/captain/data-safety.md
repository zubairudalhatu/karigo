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

September 2026 correction: Captain uses foreground location and background location during accepted active assignments, plus optional Agora voice calling. Uploaded internal version 16 declares background location and microphone access. The local correction adds a prominent disclosure before the background permission request and stops tracking when active work ends or cannot be verified. These source changes are not yet shipped. Contacts, SMS and call-log access are not required. Legacy storage and media-projection permissions in uploaded artifacts require a replacement AAB; future config blocks them.

This worksheet is evidence preparation, not a finalized Play declaration. Voice/audio, in-app messages, SDK device/network identifiers and diagnostics must be reconciled with Agora, Google Maps, Expo/Firebase and actual hosting/provider terms. Absence of a dedicated crash SDK does not establish absence of diagnostics. No blanket service-provider exception or No sharing conclusion is supported. Non-ephemeral profile, location, message and uploaded-document records must be declared as retained. Provider-specific sharing and retention remain under review.
