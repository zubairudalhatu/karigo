# KariGO ad-creative private-storage adapter evidence — 2026-10-03

## Architecture

Ad creative bytes pass through the backend validation pipeline before storage. The pipeline accepts only verified JPEG or PNG bytes, enforces the 5 MiB limit and image dimensions, and strips JPEG APP1/APP13 metadata before invoking `AdCreativeStorageService`.

Production uses the existing `@aws-sdk/client-s3` dependency against the Google Cloud Storage XML API. The adapter exposes only put, read, head, delete, and a bounded read-only readiness check. It does not expose bucket-administration or public-ACL operations. Local and test environments can explicitly select the filesystem adapter; production rejects any driver other than `gcs`.

The database remains authoritative. Clients provide campaign or asset IDs, never provider keys. The backend resolves campaign ownership, revision state, the creative record, provider, bucket, and opaque key before storage access. Customer reads require the asset to belong to the current approved revision of an active, scheduled, unexhausted campaign. Vendor reads and deletes require ownership; approved live creative deletion is refused. Admin preview still uses authenticated role checks.

## Runtime configuration contract

| Variable | Production value or rule |
| --- | --- |
| `AD_CREATIVE_STORAGE_DRIVER` | `gcs` |
| `AD_CREATIVE_STORAGE_ENDPOINT` | `https://storage.googleapis.com` |
| `AD_CREATIVE_STORAGE_REGION` | `auto` |
| `AD_CREATIVE_STORAGE_BUCKET` | `karigo-ad-creatives-private` |
| `AD_CREATIVE_STORAGE_FORCE_PATH_STYLE` | `true` |
| `AD_CREATIVE_STORAGE_ACCESS_KEY_ID` | Render secret; never committed |
| `AD_CREATIVE_STORAGE_SECRET_ACCESS_KEY` | Render secret; never committed |
| `AD_CREATIVE_STORAGE_TIMEOUT_MS` | bounded positive integer; default `8000` |

The adapter fails closed at the production storage boundary unless the GCS driver and every provider setting are present and valid. There is no fallback to Partner storage, Captain storage, public URLs, or Render's filesystem.

## Object and metadata policy

Keys use the opaque immutable form:

`campaigns/<random-128-bit>/revisions/<random-128-bit>/<random-128-bit>.jpg|png`

The segments do not contain a database ID, vendor identity, filename, title, contact detail, or other user input. Upload requests set only the validated content type and byte length. They send no original-filename metadata, ACL, or AWS-specific server-side-encryption header. GCS provides its configured Google-managed encryption.

Every asset records the provider, bucket, opaque key, authoritative MIME type, byte count, dimensions, and SHA-256 digest. Replacement uploads create new objects. The approved revision remains the customer-delivery authority until an administrator approves a replacement.

## Errors, retry, and readiness

Provider 404 reads map to application not-found. Delete is idempotent when an object is absent. Authentication, authorization, timeout, and provider failures map to generic application errors. Logs contain only operation, normalized category, and HTTP status when present; credentials, bucket keys, filenames, provider bodies, signatures, and request IDs are not emitted.

The SDK is limited to three attempts and each operation has an abort timeout capped at 30 seconds. Readiness uses authenticated `ListObjectsV2` with `MaxKeys: 1`; it performs no write and returns no object names.

## Test strategy

Normal tests use the local adapter or an injected S3 client double. Coverage includes JPEG/PNG upload, byte equality, opaque keys, absent filename metadata, invalid and malformed input, size limits, ownership boundaries, approved-revision delivery, replacement safety, safe 403/404/provider error mapping, idempotent delete, incomplete production configuration, and bounded operations.

The real bucket is deliberately excluded from normal test runs. A later owner-approved lifecycle test can run:

`npm run verify:ad-creative-storage --workspace @karigo/backend-api`

The command also requires `CONFIRM_AD_CREATIVE_STORAGE_LIVE_TEST=TASK-AD-CREATIVE-SYNTHETIC` and the seven `AD_CREATIVE_STORAGE_*` values supplied to the process from the approved secret location. It uploads one synthetic PNG under `verification/ad-creatives/`, compares returned bytes, deletes it, confirms absence, and prints only safe pass/fail categories.

## Future Render procedure

1. Confirm the live SHA and production health.
2. Load exactly the seven storage variables from the approved values and local credential file using Render's secret fields.
3. Verify the exact environment-variable diff and save without deployment.
4. Run the separately approved synthetic bucket lifecycle test.
5. Rehearse the existing `20261003120000_ads_manager_phone_change` migration against a production-derived isolated database if its production application is still pending.
6. Deploy the exact reviewed SHA only after a separate approval, then verify boot validation, storage readiness, upload/read/delete, cross-tenant denial, and API health.

## Credential rotation

Create a new HMAC for the same dedicated service account, capture its distinct access ID and one-time secret outside Git, validate a read-only bucket probe, stage only the two credential variables, reload the runtime, and run a synthetic lifecycle test. Disable the old credential only after the replacement succeeds. Delete an inactive key only under separate approval.
