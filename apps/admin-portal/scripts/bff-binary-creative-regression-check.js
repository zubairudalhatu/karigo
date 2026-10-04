const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
const ts = require("typescript");

const root = path.resolve(__dirname, "..");
const helperPath = path.join(root, "src", "lib", "bff-binary-response.ts");
const helperSource = fs.readFileSync(helperPath, "utf8");
const compiled = ts.transpileModule(helperSource, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
}).outputText;
const helperModule = { exports: {} };
new Function("exports", "module", compiled)(helperModule.exports, helperModule);
const { isCreativeBinaryRequest, prepareCreativeBinaryResponse } = helperModule.exports;

const creativePath = "ads/creative/08c79b73-24ca-4c37-a380-2f0a78a730fc";
const differentCreativePath = "ads/creative/b48db5f7-7b9e-4f64-90f1-b4565e8e81b8";

const collect = async (prepared) => new Uint8Array(await new Response(prepared.body).arrayBuffer());

(async () => {
  for (const [mediaType, bytes] of [
    ["image/png", Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x00, 0xff, 0x1a])],
    ["image/jpeg", Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10])]
  ]) {
    const upstream = new Response(bytes, {
      status: 200,
      headers: {
        "content-type": `${mediaType}; charset=binary`,
        "content-length": String(bytes.byteLength),
        etag: '"safe-etag"',
        "x-upstream-secret": "must-not-pass"
      }
    });
    const prepared = prepareCreativeBinaryResponse(creativePath, "GET", upstream);
    assert.equal(prepared.kind, "binary", `${mediaType} must be accepted for the creative route.`);
    assert.deepEqual(await collect(prepared), bytes, `${mediaType} bytes must remain byte-for-byte identical.`);
    assert.equal(prepared.headers.get("content-type"), mediaType);
    assert.equal(prepared.headers.get("cache-control"), "private, no-store");
    assert.equal(prepared.headers.get("x-content-type-options"), "nosniff");
    assert.equal(prepared.headers.get("content-length"), String(bytes.byteLength));
    assert.equal(prepared.headers.get("x-upstream-secret"), null, "Unreviewed upstream headers must not pass through.");
  }

  assert.equal(isCreativeBinaryRequest(creativePath, "GET"), true);
  assert.equal(isCreativeBinaryRequest(creativePath, "POST"), false, "Unsafe methods must never enter the binary branch.");
  assert.equal(isCreativeBinaryRequest("ads/creative/not-a-uuid", "GET"), false, "Arbitrary object keys must not be proxied.");
  assert.equal(isCreativeBinaryRequest("vendors/creative/08c79b73-24ca-4c37-a380-2f0a78a730fc", "GET"), false);
  assert.equal(isCreativeBinaryRequest(differentCreativePath, "GET"), true);

  const jsonApiResponse = prepareCreativeBinaryResponse("admin/ads", "GET", new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { "content-type": "application/json" }
  }));
  assert.equal(jsonApiResponse.kind, "not-binary", "Ordinary JSON API responses must stay on the existing JSON response path.");

  for (const mediaType of ["text/html", "image/svg+xml", "application/javascript", "application/octet-stream", "application/json"]) {
    const prepared = prepareCreativeBinaryResponse(creativePath, "GET", new Response("unsafe", {
      status: 200,
      headers: { "content-type": mediaType }
    }));
    assert.equal(prepared.kind, "rejected", `${mediaType} must be rejected.`);
  }

  for (const status of [401, 403, 404]) {
    const prepared = prepareCreativeBinaryResponse(creativePath, "GET", new Response("safe upstream error", {
      status,
      headers: { "content-type": "text/html", "x-error-detail": "must-not-pass" }
    }));
    assert.equal(prepared.kind, "not-binary", `Upstream ${status} must remain on the safe authenticated error path.`);
  }

  const bffSession = fs.readFileSync(path.join(root, "src", "lib", "bff-session.ts"), "utf8");
  assert(bffSession.includes('headers.set("Authorization", `Bearer ${accessToken}`)'), "Creative retrieval must retain authenticated backend access.");
  assert(bffSession.includes("prepareCreativeBinaryResponse(path, request.method, backendResponse)"), "The BFF must use the reviewed binary response gate.");
  assert(bffSession.includes("new NextResponse(creativeResponse.body"), "The BFF must stream the upstream body without JSON/text coercion.");
  assert(bffSession.includes("BFF_CREATIVE_MEDIA_TYPE_REJECTED"), "Unexpected creative MIME types must return a safe bounded error.");
  assert(!helperSource.includes(".json(") && !helperSource.includes(".text("), "The binary helper must not coerce creative bytes to JSON or text.");

  const adsPage = fs.readFileSync(path.join(root, "app", "ads", "page.tsx"), "utf8");
  const styles = fs.readFileSync(path.join(root, "app", "globals.css"), "utf8");
  assert(adsPage.includes("/api/bff${value}"), "Private creative previews must continue through the same-origin authenticated BFF.");
  assert(adsPage.includes("creativeAltText") && adsPage.includes("advertising creative"), "Creative previews must retain reviewed alt text and fallback text.");
  assert(styles.includes(".creative-frame img") && styles.includes("object-fit: contain") && styles.includes("width: 100%"), "Creative previews must remain responsive and contained.");

  console.log("Admin BFF binary creative regression checks passed.");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
