const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
require('reflect-metadata');
const root = path.resolve(__dirname, '../../..');
const cache = new Map();
function load(relative) {
  const file = path.resolve(root, relative);
  if (cache.has(file)) return cache.get(file).exports;
  const mod = new Module(file, module); cache.set(file, mod); mod.filename = file; mod.paths = Module._nodeModulePaths(path.dirname(file));
  const original = mod.require.bind(mod);
  mod.require = id => id === '@karigo/shared-types' ? load('packages/shared-types/src/partner-orders.ts')
    : id.startsWith('.') && fs.existsSync(path.resolve(path.dirname(file), id + '.ts')) ? load(path.resolve(path.dirname(file), id + '.ts')) : original(id);
  mod._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, experimentalDecorators: true } }).outputText, file);
  return mod.exports;
}
const model = load('apps/partner-app/src/lib/order-operations.ts');
const push = load('apps/partner-app/src/lib/order-push.ts');
const contract = load('packages/shared-types/src/partner-orders.ts');
const { VendorOrderStatusService } = load('services/backend-api/src/modules/vendor-dashboard-orders/vendor-order-status.service.ts');
const { VendorOrderRejectionReason } = load('services/backend-api/src/modules/vendor-dashboard-orders/dto/reject-vendor-order.dto.ts');
const domain = new VendorOrderStatusService();
const id = '11111111-1111-4111-8111-111111111111';
function order(state = 'PAID') { return { id, orderNumber: 'SYNTHETIC-ORDER', orderStatus: state, paymentStatus: 'SUCCESSFUL', updatedAt: new Date(0).toISOString(), availableActions: domain.actionsFor(state), rejectionReasons: contract.partnerOrderRejectionReasons, items: [], statusHistory: [] }; }
const pause = () => { let resolve; const promise = new Promise(r => resolve = r); return { promise, resolve }; };
function fixture() {
  let current = order(), posts = 0, reads = 0, tick = 0, changed = 0;
  const transport = { detail: async () => { reads++; return structuredClone(current); }, mutate: async (_id, action, version) => {
    posts++; assert.equal(version.expectedStatus, current.orderStatus); assert.equal(version.expectedUpdatedAt, current.updatedAt);
    const target = { accept: 'VENDOR_ACCEPTED', reject: 'VENDOR_REJECTED', preparing: 'PREPARING', ready: 'READY_FOR_PICKUP' }[action];
    domain.assertTransition(current.orderStatus, target);
    current = { ...order(target), updatedAt: new Date(++tick * 1000).toISOString() }; return structuredClone(current);
  } };
  const operations = new model.OrderOperations(id, transport, () => 1, () => changed++);
  return { operations, transport, get current() { return current; }, set current(value) { current = value; }, get posts() { return posts; }, get reads() { return reads; }, get changed() { return changed; } };
}
test('all mobile action/reason contracts match the existing backend domain', () => {
  assert.deepEqual([...contract.partnerOrderRejectionReasons], Object.values(VendorOrderRejectionReason));
  const actions = new Set(['PAID','VENDOR_CONFIRMING','VENDOR_ACCEPTED','PREPARING'].flatMap(s => domain.actionsFor(s)));
  assert.deepEqual([...actions].sort(), [...contract.partnerOrderActions].sort());
});
test('approved merchant flow accepts, prepares and marks ready using fetched versions', async () => {
  const f = fixture(); await f.operations.resource.load();
  for (const action of ['accept', 'preparing', 'ready']) {
    const beforeReads = f.reads;
    const result = await f.operations.perform(model.confirmOrderAction(f.operations.resource.snapshot().data, action));
    assert.equal(result, 'confirmed'); assert(f.reads >= beforeReads + 2); assert.equal(f.operations.resource.snapshot().data.orderStatus, f.current.orderStatus);
  }
  assert.equal(f.posts, 3); assert.equal(f.changed, 3); assert.deepEqual(model.availableOrderActions(f.current), []);
});
test('reject requires a real reason and reports refund review without refund execution', async () => {
  const f = fixture(); await f.operations.resource.load(); const confirmation = model.confirmOrderAction(f.current, 'reject');
  assert.equal(await f.operations.perform(confirmation), 'blocked'); assert.equal(f.posts, 0);
  const mutate = f.transport.mutate;
  f.transport.mutate = async (...args) => ({ ...await mutate(...args), refundReviewRequired: true });
  assert.equal(await f.operations.perform(confirmation, 'ITEM_UNAVAILABLE', 'Sold out'), 'confirmed');
  assert.match(f.operations.snapshot().message, /did not execute a refund/);
});
test('stale state before POST refreshes and requires a new confirmation', async () => {
  const f = fixture(); await f.operations.resource.load(); const confirmation = model.confirmOrderAction(f.current, 'accept');
  f.current = { ...order('CANCELLED'), updatedAt: new Date(1000).toISOString() };
  assert.equal(await f.operations.perform(confirmation), 'changed'); assert.equal(f.posts, 0); assert.equal(f.operations.resource.snapshot().data.orderStatus, 'CANCELLED');
});
test('same-state timestamp changes are also stale', async () => {
  const f = fixture(); await f.operations.resource.load(); const confirmation = model.confirmOrderAction(f.current, 'accept');
  f.current = { ...f.current, updatedAt: new Date(1000).toISOString() };
  assert.equal(await f.operations.perform(confirmation), 'changed'); assert.equal(f.posts, 0);
});
test('two immediate confirmations produce one POST', async () => {
  const f = fixture(); await f.operations.resource.load(); const confirmation = model.confirmOrderAction(f.current, 'accept');
  const deferred = pause(), mutate = f.transport.mutate;
  f.transport.mutate = async (...args) => { await deferred.promise; return mutate(...args); };
  const first = f.operations.perform(confirmation);
  assert.equal(await f.operations.perform(confirmation), 'blocked'); deferred.resolve();
  assert.equal(await first, 'confirmed'); assert.equal(f.posts, 1);
});
test('offline refresh keeps cached data read-only and never queues a mutation', async () => {
  const f = fixture(); await f.operations.resource.load(); const confirmation = model.confirmOrderAction(f.current, 'accept');
  f.transport.detail = async () => { throw new Error('synthetic network unavailable'); };
  await f.operations.resource.load(); assert.equal(f.operations.resource.snapshot().fresh, false);
  assert.equal(await f.operations.perform(confirmation), 'blocked'); assert.equal(f.posts, 0);
});
test('network lost during preflight cannot submit', async () => {
  const f = fixture(); await f.operations.resource.load();
  f.transport.detail = async () => { throw new Error('synthetic timeout'); };
  assert.equal(await f.operations.perform(model.confirmOrderAction(f.current, 'accept')), 'blocked'); assert.equal(f.posts, 0);
});
test('lost POST response refreshes without automatic replay or unconfirmed success', async () => {
  const f = fixture(); await f.operations.resource.load(); const mutate = f.transport.mutate;
  f.transport.mutate = async (...args) => { await mutate(...args); throw new Error('response lost'); };
  assert.equal(await f.operations.perform(model.confirmOrderAction(f.current, 'accept')), 'uncertain');
  assert.equal(f.posts, 1); assert.equal(f.operations.resource.snapshot().data.orderStatus, 'VENDOR_ACCEPTED');
  assert.match(f.operations.snapshot().message, /could not be confirmed/);
});
test('409 between preflight and write refreshes terminal state without replay', async () => {
  const f = fixture(); await f.operations.resource.load();
  f.transport.mutate = async () => { f.current = order('CANCELLED'); throw { status: 409, message: 'internal-secret-never-display' }; };
  assert.equal(await f.operations.perform(model.confirmOrderAction(f.current, 'accept')), 'changed');
  assert.deepEqual(model.availableOrderActions(f.operations.resource.snapshot().data), []); assert.doesNotMatch(f.operations.snapshot().message, /internal-secret/);
});
test('revoked authorization clears cached private detail', async () => {
  const f = fixture(); await f.operations.resource.load(); f.transport.detail = async () => { throw { status: 401 }; };
  await f.operations.resource.load(); assert.equal(f.operations.resource.snapshot().data, null);
});
test('late response from another auth generation cannot populate a screen', async () => {
  let generation = 1; const pending = pause(); const resource = new model.OrderResource(() => pending.promise, () => generation);
  const read = resource.load(); generation = 2; pending.resolve(order()); await read;
  assert.equal(resource.snapshot().data, null); assert.equal(resource.snapshot().fresh, false);
});
test('reads are single-flight; forced reload starts after any earlier read', async () => {
  const pending = pause(); let calls = 0;
  const resource = new model.OrderResource(async () => { calls++; return calls === 1 ? pending.promise : order('CANCELLED'); }, () => 1);
  const first = resource.load(), second = resource.load(), after = resource.reload(); pending.resolve(order());
  await Promise.all([first, second, after]); assert.equal(calls, 2); assert.equal(resource.snapshot().data.orderStatus, 'CANCELLED');
});
test('terminal orders and unknown server actions never produce merchant controls', () => {
  for (const state of ['DELIVERED','COMPLETED','CANCELLED','REFUNDED','FAILED','VENDOR_REJECTED']) assert.deepEqual(model.availableOrderActions({ ...order(state), availableActions: ['accept', 'complete', 'handoff'] }), []);
  assert.deepEqual(model.availableOrderActions({ ...order(), availableActions: ['complete', 'handoff', 'refund'] }), []);
});
test('groups correspond to actual states, including history and courier responsibility', () => {
  assert.equal(model.orderGroup('PAID'), 'New / action required'); assert.equal(model.orderGroup('PREPARING'), 'Preparing / active');
  assert.equal(model.orderGroup('READY_FOR_PICKUP'), 'Ready / courier'); assert.equal(model.orderGroup('RIDER_ASSIGNED'), 'Ready / courier');
  assert.equal(model.orderGroup('DELIVERED'), 'Completed'); assert.equal(model.orderGroup('COMPLETED'), 'Completed'); assert.equal(model.orderGroup('VENDOR_REJECTED'), 'Cancelled / closed');
});
test('mutation invalidation refreshes subscribed lists', () => {
  let calls = 0; const stop = model.subscribePartnerOrderChanges(changedId => { assert.equal(changedId, id); calls++; });
  model.notifyPartnerOrderChanged(id); stop(); model.notifyPartnerOrderChanged(id); assert.equal(calls, 1);
});
test('notification tap reauthorizes and reads the exact current order', async () => {
  let reads = 0; const data = { appSurface: 'PARTNER_APP', route: 'order', entityId: id, orderStatus: 'PAID' };
  const latest = order('CANCELLED');
  const resolved = await push.resolvePartnerOrderPush(data, { current: () => true, approved: async () => true, detail: async orderId => { assert.equal(orderId, id); reads++; return latest; } });
  assert.equal(resolved, id); assert.equal(reads, 1); assert.deepEqual(model.availableOrderActions(latest), []);
});
test('logged-out, unapproved, foreign and malformed notifications cannot navigate', async () => {
  const data = { appSurface: 'PARTNER_APP', route: 'order', entityId: id }; let reads = 0;
  const deps = { current: () => true, approved: async () => true, detail: async () => { reads++; throw { status: 404 }; } };
  assert.equal(await push.resolvePartnerOrderPush(data, { ...deps, current: () => false }), null);
  assert.equal(await push.resolvePartnerOrderPush(data, { ...deps, approved: async () => false }), null);
  assert.equal(await push.resolvePartnerOrderPush({ ...data, appSurface: 'RIDER_APP' }, deps), null);
  assert.equal(await push.resolvePartnerOrderPush({ ...data, entityId: '../../not-an-order' }, deps), null);
  assert.equal(await push.resolvePartnerOrderPush(data, deps), null); assert.equal(reads, 1);
});
test('duplicate notification identifiers are claimed once with bounded memory', () => {
  const claims = new push.PartnerPushClaims(); assert.equal(claims.claim('one'), true); assert.equal(claims.claim('one'), false);
  for (let i = 0; i < 129; i++) claims.claim(String(i)); assert.equal(claims.claim('one'), true);
});
test('source transport never queues/replays order POSTs and polling stays foreground-only', () => {
  const api = fs.readFileSync(path.join(root, 'apps/partner-app/src/api/partner.api.ts'), 'utf8');
  assert.match(api, /retryOnNetworkFailure: false, retryOnTemporaryFailure: false/);
  const hook = fs.readFileSync(path.join(root, 'apps/partner-app/src/lib/use-order-resource.ts'), 'utf8');
  assert.match(hook, /AppState.currentState === "active"/); assert.match(hook, /20000/); assert.match(hook, /clearInterval/);
});
test('actual API adapter pins writes to the confirming session and rejects a token-read account race', async () => {
  const file = path.join(root, 'apps/partner-app/src/api/partner.api.ts');
  const mod = new Module(file, module); let generation = 1, posts = 0; const token = pause();
  mod.require = id => {
    assert.equal(id, './client');
    return { api: { post: async () => { posts++; return {}; } }, authSessionStore: { currentGeneration: () => generation, isCurrent: value => value === generation }, tokenStore: { getToken: () => token.promise } };
  };
  mod._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText, file);
  const request = mod.exports.partnerApi.orderAction(id, 'accept', { expectedStatus: 'PAID', expectedUpdatedAt: new Date(0).toISOString() });
  generation = 2; token.resolve('synthetic-access-token');
  await assert.rejects(request, /session changed/); assert.equal(posts, 0);
});
