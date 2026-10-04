const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
const ts = require("typescript");

const root = path.resolve(__dirname, "..");
const helperSource = fs.readFileSync(path.join(root, "src/lib/private-ad-creative.ts"), "utf8");
const compiled = ts.transpileModule(helperSource, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
}).outputText;
const helperModule = { exports: {} };
new Function("exports", "module", compiled)(helperModule.exports, helperModule);
const { loadPrivateAdCreative, privateAdCreativePolicy } = helperModule.exports;

const apiBase = "https://api.example.test/api/v1";
const assetId = "08c79b73-24ca-4c37-a380-2f0a78a730fc";
const creativeUrl = `${apiBase}/ads/creative/${assetId}`;
const png = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);
const jpeg = Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 0x00]);

function wrapped(mediaType, bytes) {
  return new Response(JSON.stringify({
    success: true,
    data: {
      options: { type: mediaType, length: bytes.byteLength },
      stream: { _readableState: { length: bytes.byteLength, buffer: [{ type: "Buffer", data: [...bytes] }] } }
    }
  }), { status: 200, headers: { "content-type": "application/json" } });
}

(async () => {
  for (const [mediaType, bytes] of [["image/png", png], ["image/jpeg", jpeg]]) {
    let authorization = "";
    const direct = await loadPrivateAdCreative(creativeUrl, apiBase, "customer-token", async (_url, init) => {
      authorization = init.headers.Authorization;
      return new Response(bytes, { status: 200, headers: { "content-type": mediaType } });
    });
    assert.equal(authorization, "Bearer customer-token", `${mediaType} retrieval must use the Customer session.`);
    assert(direct.startsWith(`data:${mediaType};base64,`), `${mediaType} must become a bounded renderable source.`);

    const fromWrappedResponse = await loadPrivateAdCreative(creativeUrl, apiBase, "customer-token", async () => wrapped(mediaType, bytes));
    assert(fromWrappedResponse.startsWith(`data:${mediaType};base64,`), `${mediaType} compatibility response must render.`);
  }

  let calledWithoutAuth = false;
  assert.equal(await loadPrivateAdCreative(creativeUrl, apiBase, null, async () => {
    calledWithoutAuth = true;
    return new Response(png);
  }), null, "Missing authentication must be rejected.");
  assert.equal(calledWithoutAuth, false, "Missing authentication must fail before network access.");

  for (const response of [
    new Response(JSON.stringify({ success: false, message: "private error" }), { status: 200, headers: { "content-type": "application/json" } }),
    new Response("not found", { status: 404, headers: { "content-type": "application/json" } }),
    new Response("<html>unsafe</html>", { status: 200, headers: { "content-type": "text/html" } }),
    new Response("<svg/>", { status: 200, headers: { "content-type": "image/svg+xml" } }),
    new Response(Uint8Array.from([1, 2, 3]), { status: 200, headers: { "content-type": "image/png" } })
  ]) {
    assert.equal(await loadPrivateAdCreative(creativeUrl, apiBase, "customer-token", async () => response), null, "Unsafe or malformed responses must not become image sources.");
  }

  assert((await loadPrivateAdCreative(`/ads/creative/${assetId}`, apiBase, "customer-token", async () => new Response(png, { status: 200, headers: { "content-type": "image/png" } })))?.startsWith("data:image/png;base64,"), "The approved backend creative path must be accepted.");
  for (const unsafeSource of [
    "https://storage.googleapis.com/private/provider-key",
    `${apiBase}/ads/revisions/${assetId}/creative`,
    `${apiBase}/ads/creative/not-a-uuid`,
    `${creativeUrl}?revision=draft`,
    `https://attacker.example/ads/creative/${assetId}`
  ]) {
    let called = false;
    assert.equal(await loadPrivateAdCreative(unsafeSource, apiBase, "customer-token", async () => {
      called = true;
      return new Response(png);
    }), null, "Only the approved creative endpoint may be fetched.");
    assert.equal(called, false, "Rejected creative paths must not reach the network.");
  }

  assert.deepEqual(privateAdCreativePolicy.allowedMediaTypes, ["image/png", "image/jpeg"]);
  assert.equal(privateAdCreativePolicy.maxBytes, 5 * 1024 * 1024);

  const home = fs.readFileSync(path.join(root, "app/tabs/home.tsx"), "utf8");
  const adsApi = fs.readFileSync(path.join(root, "src/api/ads.api.ts"), "utf8");
  assert(home.includes("homeAdCreativeUri") && home.includes("onError={() => setHomeAdCreativeUri(null)}"), "Creative failure must fall back to the intact sponsored card.");
  assert.equal((home.match(/recordEvent\(homeAd\.id, "IMPRESSION"/g) || []).length, 1, "Image retries must not add impression calls.");
  assert(home.includes('recordEvent(ad.id, "CLICK"') && home.includes("event.destination"), "CTA click tracking and navigation must remain intact.");
  assert(adsApi.includes("tokenStore.getToken()"), "Creative retrieval must use the current Customer session.");
  assert(!home.includes("storage.googleapis.com") && !helperSource.includes("storage.googleapis.com"), "No provider URL or key may be exposed.");

  console.log("Customer Mobile private ad creative regression checks passed.");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
