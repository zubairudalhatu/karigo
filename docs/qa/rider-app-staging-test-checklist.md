# Rider App Staging Test Checklist

Use approved internal devices and staging demo accounts only. Do not record passwords,
bearer tokens, delivery OTPs, full phone numbers, device identifiers, or real customer
details in Git.

## Environment

- App: KariGO Rider Staging
- API: `https://karigo-8htn.onrender.com/api/v1`
- Providers: mock only

## Checklist

| Check | Expected result | Status | Notes |
| --- | --- | --- | --- |
| App installs | Internal build installs without replacing production app | Pending |  |
| Splash/logo loads | KariGO logo displays cleanly | Pending |  |
| Login works | Demo rider can sign in | Pending | Use secure credential handover |
| Rider profile loads | Profile screen shows rider data | Pending |  |
| Online/offline works | Availability updates through staging API | Pending |  |
| Job list loads | Assigned jobs display or safe empty state appears | Pending |  |
| Assigned job opens | Job detail loads correctly | Pending |  |
| Job accept/reject works | Valid actions update backend | Pending |  |
| Pickup status works | Pickup status updates safely | Pending |  |
| On-the-way status works | Delivery status updates safely | Pending |  |
| Delivery OTP completion works | Correct OTP completes delivery | Pending | Do not record OTP |
| Earnings page loads | Earnings summary renders | Pending |  |
| Notification page loads | Rider notifications render | Pending |  |
| API errors are safe | No raw JSON/stack traces shown | Pending |  |
| Render cold-start handled | Loading/retry behavior is understandable | Pending |  |

## Seeded Persona Reference

| Persona | Login phone placeholder |
| --- | --- |
| Demo rider | `<demo-rider-phone>` |
| Operations admin | `<operations-admin-phone>` |

Passwords must remain outside Git.
