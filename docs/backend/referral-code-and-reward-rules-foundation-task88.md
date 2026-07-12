# Referral Code and Reward Rules Foundation - Task 88

## Scope

Task 88 adds the backend foundation for customer referral codes, referral tracking and future reward-rule configuration.

This foundation does not activate live reward fulfillment.

## Current Behaviour

- Every customer can have a referral profile with a unique referral code.
- Existing legacy `CustomerProfile.referralCode` values are preserved.
- A dedicated `CustomerReferralProfile` is created for new customers and lazily ensured for existing customers.
- Customer registration can accept an optional `referralCode`.
- If a valid referral code is supplied, KariGO records a referral relationship.
- Phone verification updates the referral record from `REGISTERED` to `ACCOUNT_ACTIVATED`.
- Admin users can review referral records.
- Admin users can create and update reward rules for future review.

## API Endpoints

Customer:

- `GET /api/v1/referrals/me`
- `GET /api/v1/referrals/my-referrals`

Admin:

- `GET /api/v1/admin/referrals`
- `GET /api/v1/admin/referrals/reward-rules`
- `POST /api/v1/admin/referrals/reward-rules`
- `PATCH /api/v1/admin/referrals/reward-rules/:ruleId`

## Reward Fulfillment Guardrails

The following remain disabled:

- Automatic wallet reward posting.
- Airtime or data fulfillment.
- Promo issuing.
- SMS, email, WhatsApp or push referral messages.
- Referral leaderboard.
- Subscription or withdrawal integration.

Reward rules are configuration and review records only until a later approved task activates controlled fulfillment.

## Data Models

Added Prisma models:

- `CustomerReferralProfile`
- `CustomerReferral`
- `CustomerReferralRewardRule`

Added Prisma enums:

- `CustomerReferralProfileStatus`
- `CustomerReferralStatus`
- `ReferralRewardTrigger`
- `ReferralRewardType`

## Security Notes

- Customer referral endpoints require authenticated customer access.
- Admin referral endpoints require admin access and approved admin roles.
- Customer referral history does not expose referred customer phone numbers or email addresses.
- Referral APIs do not expose wallet secrets, payment tokens, OTPs or provider credentials.
- Admin reward-rule changes are audit logged.

## Future TODO

- Add Customer App referral sharing UI.
- Add Admin Portal referral tracking dashboard.
- Add explicit valid-transaction eligibility evaluation.
- Add controlled reward review workflow.
- Add wallet credit reward posting only after management approval.
- Add opt-in referral messaging only after notification consent rules are ready.
