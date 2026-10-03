const {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client
} = require("@aws-sdk/client-s3");
const { randomBytes } = require("node:crypto");

const CONFIRMATION = "TASK-AD-CREATIVE-SYNTHETIC";
if (process.env.CONFIRM_AD_CREATIVE_STORAGE_LIVE_TEST !== CONFIRMATION) {
  throw new Error(`Refusing live storage verification without CONFIRM_AD_CREATIVE_STORAGE_LIVE_TEST=${CONFIRMATION}`);
}

const required = [
  "AD_CREATIVE_STORAGE_ENDPOINT",
  "AD_CREATIVE_STORAGE_REGION",
  "AD_CREATIVE_STORAGE_BUCKET",
  "AD_CREATIVE_STORAGE_ACCESS_KEY_ID",
  "AD_CREATIVE_STORAGE_SECRET_ACCESS_KEY"
];
for (const key of required) {
  if (!process.env[key]?.trim()) throw new Error(`Missing required variable: ${key}`);
}
if (process.env.AD_CREATIVE_STORAGE_ENDPOINT !== "https://storage.googleapis.com") throw new Error("Unexpected storage endpoint");
if (process.env.AD_CREATIVE_STORAGE_REGION !== "auto") throw new Error("Unexpected storage region");
if (process.env.AD_CREATIVE_STORAGE_FORCE_PATH_STYLE !== "true") throw new Error("Path-style addressing must be enabled");

const client = new S3Client({
  endpoint: process.env.AD_CREATIVE_STORAGE_ENDPOINT,
  region: process.env.AD_CREATIVE_STORAGE_REGION,
  forcePathStyle: true,
  credentials: {
    accessKeyId: process.env.AD_CREATIVE_STORAGE_ACCESS_KEY_ID,
    secretAccessKey: process.env.AD_CREATIVE_STORAGE_SECRET_ACCESS_KEY
  },
  maxAttempts: 3
});
const bucket = process.env.AD_CREATIVE_STORAGE_BUCKET;
const key = `verification/ad-creatives/${randomBytes(16).toString("hex")}.png`;
const bytes = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", "base64");
let uploaded = false;

async function send(command) {
  return client.send(command, { abortSignal: AbortSignal.timeout(10_000) });
}

async function main() {
  try {
    await send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: bytes, ContentType: "image/png", ContentLength: bytes.length }));
    uploaded = true;
    const response = await send(new GetObjectCommand({ Bucket: bucket, Key: key }));
    const received = Buffer.from(await response.Body.transformToByteArray());
    if (!received.equals(bytes)) throw new Error("Synthetic byte comparison failed");
    await send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
    uploaded = false;
    let absent = false;
    try {
      await send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    } catch (error) {
      absent = error?.$metadata?.httpStatusCode === 404 || error?.name === "NotFound" || error?.name === "NoSuchKey";
    }
    if (!absent) throw new Error("Synthetic object cleanup was not verified");
    console.log(JSON.stringify({ upload: "passed", authenticatedRead: "passed", byteEquality: "passed", delete: "passed", cleanup: "passed" }));
  } finally {
    if (uploaded) await send(new DeleteObjectCommand({ Bucket: bucket, Key: key })).catch(() => undefined);
    client.destroy();
  }
}

main().catch((error) => {
  console.error(JSON.stringify({ verification: "failed", category: error?.name === "AbortError" ? "timeout" : "storage_verification_error" }));
  process.exitCode = 1;
});
