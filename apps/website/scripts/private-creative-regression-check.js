const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
const ts = require("typescript");

const root = path.resolve(__dirname, "..");
function loadTypeScript(relativePath) {
  const source = fs.readFileSync(path.join(root, relativePath), "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
  }).outputText;
  const module = { exports: {} };
  new Function("exports", "module", output)(module.exports, module);
  return { exports: module.exports, source };
}

const responseModule = loadTypeScript("src/lib/private-creative-response.ts");
const pathModule = loadTypeScript("src/lib/private-creative-path.ts");
const { decodeWrappedPrivateCreative, preparePrivateCreativeResponse } = responseModule.exports;
const { creativeAssetId, customerPrivateCreativePath, isCreativeAssetId } = pathModule.exports;
const assetId = "08c79b73-24ca-4c37-a380-2f0a78a730fc";

async function bytes(response) {
  return new Uint8Array(await new Response(response.body).arrayBuffer());
}

(async () => {
  for (const [type, input] of [
    ["image/png", Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])],
    ["image/jpeg", Uint8Array.from([0xff, 0xd8, 0xff, 0xe0])]
  ]) {
    const direct = preparePrivateCreativeResponse(new Response(input, { status: 200, headers: { "content-type": type, "x-provider-secret": "blocked" } }));
    assert.equal(direct.kind, "binary");
    assert.deepEqual(await bytes(direct), input, `${type} bytes must remain unchanged.`);
    assert.equal(direct.headers.get("content-type"), type);
    assert.equal(direct.headers.get("cache-control"), "private, no-store");
    assert.equal(direct.headers.get("x-provider-secret"), null);

    const wrapped = new Response(JSON.stringify({ success: true, data: {
      options: { type, length: input.byteLength },
      stream: { _readableState: { length: input.byteLength, buffer: [{ type: "Buffer", data: [...input] }] } }
    } }), { status: 200, headers: { "content-type": "application/json" } });
    assert.equal(preparePrivateCreativeResponse(wrapped).kind, "wrapped-json");
    const decoded = await decodeWrappedPrivateCreative(wrapped);
    assert.equal(decoded.kind, "binary");
    assert.deepEqual(await bytes(decoded), input, `${type} wrapped bytes must remain unchanged.`);
  }

  for (const type of ["text/html", "image/svg+xml", "application/javascript", "application/octet-stream"]) {
    assert.equal(preparePrivateCreativeResponse(new Response("unsafe", { headers: { "content-type": type } })).kind, "rejected");
  }

  assert.equal(creativeAssetId(`/ads/creative/${assetId}`), assetId);
  assert.equal(customerPrivateCreativePath(`/ads/creative/${assetId}`), `/api/private-media/${assetId}`);
  assert.equal(creativeAssetId("https://storage.googleapis.com/private/object"), null);
  assert.equal(creativeAssetId("/ads/creative/../../object"), null);
  assert.equal(isCreativeAssetId(assetId), true);
  assert.equal(isCreativeAssetId("provider/object-key"), false);

  const route = fs.readFileSync(path.join(root, "app/api/private-media/[assetId]/route.ts"), "utf8");
  const portal = fs.readFileSync(path.join(root, "src/components/customer-web-portal.tsx"), "utf8");
  const styles = fs.readFileSync(path.join(root, "app/globals.css"), "utf8");
  assert(route.includes('authorization?.startsWith("Bearer ")'), "Unauthenticated requests must be rejected.");
  assert(route.includes("isCreativeAssetId(assetId)"), "Arbitrary object keys must be rejected before backend access.");
  assert(route.includes('Accept: "image/png, image/jpeg"'), "Only reviewed creative MIME types may be requested.");
  assert(!route.includes("storage.googleapis.com") && !route.includes("storageKey"), "No provider URL or object key may be exposed.");
  assert(portal.includes("customerPrivateCreativePath(source)"), "Customer images must use the same-origin private media path.");
  assert(portal.includes('Authorization: `Bearer ${accessToken}`'), "The current Customer session must authenticate media retrieval.");
  assert(portal.includes('ads/${homeAd.id}/events') && portal.includes('eventType: "IMPRESSION"') && portal.includes('eventType: "CLICK"'), "Existing impression and click tracking must remain present.");
  assert(styles.includes("aspect-ratio: 40 / 21") && styles.includes("object-fit: contain") && styles.includes("width: 100%"), "The 1200×630 creative must remain contained without horizontal overflow.");
  assert(responseModule.source.includes('new Headers({') && !responseModule.source.includes("x-goog-"), "Only reviewed response headers may be emitted.");

  console.log("Customer private creative regression checks passed.");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
