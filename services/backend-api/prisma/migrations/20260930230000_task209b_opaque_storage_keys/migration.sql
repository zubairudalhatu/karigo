-- Record provider location for new private-object manifests. Existing rows stay
-- nullable and continue to resolve through the configured legacy storage path;
-- this migration does not rewrite any provider object.
ALTER TABLE "captain_application_documents"
  ADD COLUMN "storageProvider" TEXT,
  ADD COLUMN "storageBucket" TEXT;

ALTER TABLE "vendor_private_uploads"
  ADD COLUMN "storageProvider" TEXT,
  ADD COLUMN "storageBucket" TEXT;
