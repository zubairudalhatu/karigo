/* Counts-only inventory. Never emits names, URLs, filenames, or document contents. */
const { PrismaClient } = require("@prisma/client");

function classifyOnboarding(row) {
  if (["SOURCE_UNAVAILABLE_REACQUISITION_REQUIRED", "SUPERSEDED_BY_REPLACEMENT"].includes(row.evidenceAvailability)) {
    return "HISTORICAL_RECORD_SOURCE_UNAVAILABLE";
  }
  if (row.verificationStatus === "APPROVED") return "APPROVED_ONBOARDING_EVIDENCE";
  if (["PENDING", "REJECTED"].includes(row.verificationStatus)) return "PRIVATE_ONBOARDING_DOCUMENT";
  return "UNKNOWN";
}
function isLikelyPublicReference(value) { return typeof value === "string" && /^https?:\/\//i.test(value); }

async function inventory(prisma) {
  const [applicationDocuments, onboardingDocuments, privateUploads, publicLogoCount, publicCoverCount, publicProductImageCount, publicServiceImageCount] = await Promise.all([
    prisma.vendorApplicationDocument.findMany({ select: { verificationStatus: true, documentUrl: true } }),
    prisma.vendorOnboardingDocument.findMany({ select: { id: true, verificationStatus: true, documentUrl: true, storageKey: true, evidenceAvailability: true } }),
    prisma.vendorPrivateUpload.findMany({ select: { onboardingDocumentId: true, storageKey: true } }),
    prisma.vendor.count({ where: { logoUrl: { not: null } } }),
    prisma.vendor.count({ where: { coverImageUrl: { not: null } } }),
    prisma.product.count({ where: { imageUrl: { not: null } } }),
    prisma.vendorService.count({ where: { imageUrl: { not: null } } })
  ]);
  const counts = { PUBLIC_CONTENT: publicLogoCount + publicCoverCount + publicProductImageCount + publicServiceImageCount, PRIVATE_ONBOARDING_DOCUMENT: 0, APPROVED_ONBOARDING_EVIDENCE: 0, HISTORICAL_RECORD_SOURCE_UNAVAILABLE: 0, UNKNOWN: 0 };
  let currentlyPublic = 0;
  let shouldBecomePrivate = 0;
  let requiringRetention = 0;
  for (const row of [...applicationDocuments, ...onboardingDocuments]) {
    const category = classifyOnboarding(row);
    counts[category] += 1;
    if (category !== "HISTORICAL_RECORD_SOURCE_UNAVAILABLE" && isLikelyPublicReference(row.documentUrl)) currentlyPublic += 1;
    if (category === "PRIVATE_ONBOARDING_DOCUMENT") shouldBecomePrivate += 1;
    if (category === "APPROVED_ONBOARDING_EVIDENCE") requiringRetention += 1;
  }
  const manifests = new Set(privateUploads.map((row) => row.onboardingDocumentId).filter(Boolean));
  const missingManifestRecords = onboardingDocuments.filter((row) => row.storageKey && !manifests.has(row.id)).length;
  const orphanManifestRecords = privateUploads.filter((row) => row.onboardingDocumentId && !onboardingDocuments.some((doc) => doc.id === row.onboardingDocumentId)).length;
  return {
    counts, currentlyPublic, shouldBecomePrivate, requiringRetention, unknown: counts.UNKNOWN,
    legacyPhysicalSourceObjectsRetained: 0,
    missingOrOrphanDatabaseRecords: missingManifestRecords + orphanManifestRecords,
    missingOrOrphanFiles: "NOT_DETERMINABLE_WITHOUT_AUTHORIZED_OBJECT_METADATA"
  };
}
async function run() {
  if (!process.argv.includes("--dry-run")) throw new Error("This inventory is read-only and requires --dry-run.");
  const prisma = new PrismaClient();
  try { console.log(JSON.stringify(await inventory(prisma))); } finally { await prisma.$disconnect(); }
}
if (require.main === module) run().catch((error) => { console.error(error.message); process.exitCode = 1; });
module.exports = { classifyOnboarding, inventory, isLikelyPublicReference };
