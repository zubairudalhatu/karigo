# Final Soft Launch Decision Checklist

## Technical

- [x] Backend runs and health endpoint responds
- [x] Local PostgreSQL connects, migration validates, and seed works
- [x] Customer and rider apps compile/export
- [x] Vendor and admin dashboards build
- [x] Mock payment and complete order journey work
- [x] Vendor workflow, dispatch, rider OTP completion, support, and reports work
- [ ] Real payment/refund provider is approved and tested
- [ ] Real SMS OTP is approved and tested
- [ ] Production infrastructure, secrets, backups, monitoring, HTTPS, and CORS are ready
- [ ] Physical-device and target-browser walkthrough is signed off
- [ ] Vendor/admin production session hardening is complete

## Operational

- [ ] Initial vendors onboarded and verified
- [ ] Initial riders onboarded and verified
- [ ] Dispatch officer assigned and rehearsed
- [ ] Support officer assigned and rehearsed
- [ ] Finance officer assigned and rehearsed
- [ ] Escalation contacts approved
- [ ] Daily reporting, refund, payout, and downtime processes rehearsed

## Legal And Policy

- [ ] Terms of service reviewed
- [ ] Privacy policy reviewed
- [ ] Refund policy reviewed
- [ ] Vendor agreement reviewed
- [ ] Rider agreement reviewed
- [ ] Data-protection/security review completed

## Marketing

- [ ] Launch visuals approved
- [ ] Website/app content approved
- [ ] Social-media content approved
- [ ] `KARIGOFIRST` launch promo approved
- [ ] Launch area and operating hours confirmed

## Decision

- [x] **Ready for internal demo**
- [ ] **Ready for controlled soft launch with real customers**
- [x] **Not ready for public launch**

Current recommendation: proceed with an internal stakeholder/operations demo. Do not
authorise a real-customer soft launch until every critical blocker in
`launch-blocker-audit.md` and every unchecked required item above has an accountable
owner, evidence, and sign-off.
