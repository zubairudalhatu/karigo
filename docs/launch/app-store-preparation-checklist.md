# App Store And Play Store Preparation Checklist

Task 147 adds the official production mobile release planning pack under
`docs/mobile-release/`, with related QA, operations and Go/No-Go records. Use
that pack as the source of truth before creating production EAS profiles or
submitting apps to store review.

Current Task 147 posture:

```text
Production store submission: Not approved
Controlled launch build planning: Ready
Live payments: Disabled
Squad checkout: Deferred
Monnify: Primary launch payment candidate
Paystack: Secondary launch payment candidate
```

## Customer App

- [ ] App name approved
- [ ] App icon and splash screen approved
- [ ] Screenshots approved
- [ ] Short and long descriptions approved
- [ ] Privacy-policy URL and support contact published
- [ ] Category selected
- [ ] Test build and release notes ready
- [ ] Permission declarations accurately explained
- [ ] Store listing tested against production URLs and supported devices

## Rider App

- [ ] App name and icon approved
- [ ] Screenshots and description approved
- [ ] Privacy-policy URL and support contact published
- [ ] Permission declarations and background behavior accurately explained
- [ ] Test build and release notes ready
- [ ] Rider-only access, test account/review notes, and supported devices documented

## Compliance

- [ ] No misleading availability, income, delivery-time, provider, or safety claims
- [ ] Contact/support information is accurate and monitored
- [ ] Privacy policy covers collected data and permissions
- [ ] App tested before submission; crash/security blockers closed
- [ ] Store developer accounts, signing keys, ownership, and recovery process approved
