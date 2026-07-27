# Partner App Onboarding, Password Reset and Upload QA - Task 200

Date: 2026-07-27

## Purpose

Use this checklist to verify the KariGO Partner App after Task 200 is deployed and a fresh Partner binary is installed.

## Prechecks

- Backend health endpoint is OK.
- Partner App is installed from the fresh APK/AAB build that includes `expo-image-picker` and `expo-document-picker`.
- Test partner accounts do not contain real secrets, live card data, OTPs or credentials in any test notes.
- Test files use safe sample PDFs/images only.

## In-App Partner Onboarding

1. Open KariGO Partner while logged out.
2. Tap `Start Partner Onboarding`.
3. Confirm the in-app `/register` flow opens instead of a browser.
4. Enter applicant name, Nigerian phone number and optional email.
5. Verify OTP flow and resend OTP behavior.
6. Create a password after OTP verification.
7. Select each partner type in separate test passes:
   - Product Seller
   - Service Provider
   - Both
8. Confirm business details collect Kano/Abuja city, business phone, email and contact details.
9. Confirm readiness/document placeholder step is clear.
10. Submit the application and record the returned application reference.
11. Confirm Admin can see the submitted application in partner/vendor application review.

Expected result: application is submitted for review only. No marketplace activation, payout, dispatch or public visibility is automatically enabled.

## Password Reset And Activation Link

1. From login, tap `Forgot password`.
2. Request a reset OTP for an eligible active partner phone number.
3. Complete reset with OTP and a new password.
4. Confirm partner can sign in with the new password.
5. Request activation link using an approved partner email or phone number.

Expected result: active partner password reset works through OTP. Pending partner accounts are not activated by password reset alone.

## Document Upload

1. Sign in as an approved partner.
2. Open Documents.
3. Choose document type.
4. Upload a safe sample PDF or image.
5. Confirm the generated secure URL is filled in the document URL field.
6. Submit for review.
7. Refresh and confirm document appears with review status.
8. Confirm Admin can see the submitted document metadata.

Expected result: upload is authenticated, vendor-scoped and visible for KariGO review.

## Product Image Upload

1. Open Products.
2. Add or edit a product.
3. Tap `Upload product image`.
4. Select a safe JPG, PNG or WebP image.
5. Confirm the image URL field is populated.
6. Save the product.
7. Reopen product detail/edit and confirm the image URL persisted.

Expected result: product image upload works without requiring the partner to manually host an image.

## Business Logo And Cover Upload

1. Open Profile.
2. Tap Edit partner profile.
3. Upload logo.
4. Upload cover image.
5. Confirm both URL fields are populated.
6. Save profile.
7. Reload profile and confirm branding URLs persisted.

Expected result: uploaded logo and cover image are saved only after profile save succeeds.

## Play Internal Testing Notes

- Fresh Partner AAB is required because native upload modules were added.
- OTA update alone is not sufficient for first-time Play internal testers.
- Do not publish to production from this task.

## Known Follow-Up

Full service catalogue editing and deeper service-provider operations in the Partner App remain separate follow-up work.
