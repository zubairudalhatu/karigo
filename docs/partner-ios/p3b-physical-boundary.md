# Partner iOS — P3B physical-QA boundary

Recorded 2026-11-15 at the user's accepted P3A.1 state, commit `274db9823fcbd3f75ac525b41b69958163a24b31`.

```ini
PARTNER_SOFTWARE_STAGING_READY = YES
PARTNER_P3B_BLOCKED_BY_APPLE_HOLD = YES
PARTNER_APPLE_SUBMISSION_HOLD = YES

PARTNER_PUSH_NON_APNS_CHAIN = PASS
PARTNER_STAGING_UPLOAD_E2E = PASS
PARTNER_STAGING_ACCOUNT_DELETION = PASS
PARTNER_PRIVACY_INVENTORY_MATCHES_HOSTED_BEHAVIOR = YES
```

Partner is closed at this boundary, not physically accepted. Apple identity/bundle registration, provisioning, APNs, TestFlight, physical iPhone launch, native pickers, device SecureStore, layout/accessibility and actual push receipt/tap remain intentionally deferred. No registration of `ng.com.karigo.partner`, ASC record, profile/certificate, native build, TestFlight upload or OTA is authorized. Customer and Captain remain unchanged.

Preserve isolated service `srv-dbs1cj3rjlhs73ct4q30`, private database `dpg-dbs1c73rjlhs73ct3r5g-a`, disk `dsk-dbs1cjbrjlhs73ct4r7g`, staging deployment `dep-dbs1fjlg1s2s73du2ipg` / source `ecc252ae782814f8d109a147d7619383fd4972c6`, and simulator build `5feeb54f-5864-4478-9eba-df167a3b1a2f`. Keep auto-deploy/sync OFF and the existing mock-provider/network/storage guards. Do not repurpose this environment for Squad testing; its existing safety guard intentionally forbids real payment-provider credentials and external provider traffic.

Retain the protected P3A.1 receipts/scripts and the documented consumed/deleted synthetic identities. Later P3B setup must use appropriately reviewed fresh fixtures rather than assume consumed fixtures are reusable. No resources are suspended, deleted, redeployed or reconfigured by this closeout.

Separate approval is required to cross the Apple/native boundary. PAY-01 is a separate payment audit/plan only, with no provider configuration or transaction authorization.
