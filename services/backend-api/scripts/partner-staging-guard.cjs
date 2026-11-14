// Loaded only by the dedicated Partner staging launcher; Production main is unchanged.
const { createHash } = require('node:crypto');
function assertStaging(env) {
  if (env.PARTNER_ISOLATED_STAGING !== 'true' || env.APP_ENV !== 'staging') throw Error('STAGING_MODE_REQUIRED');
  const db = new URL(env.DATABASE_URL || '');
  if (!['postgres:', 'postgresql:'].includes(db.protocol) || !db.hostname || env.DATABASE_URL !== env.STAGING_DATABASE_URL || !/^\/karigo_partner_p25(?:_[a-z0-9]+)?$/.test(db.pathname)) throw Error('STAGING_DATABASE_IDENTITY_MISMATCH');
  if (env.DIRECT_URL !== env.DATABASE_URL) throw Error('STAGING_DIRECT_DATABASE_MISMATCH');
  if (env.PARTNER_PRIVATE_STORAGE_LOCAL_ROOT !== '/var/data/partner-stage/private') throw Error('STAGING_STORAGE_REQUIRED');
  for (const key of ['JWT_SECRET','PARTNER_PRIVATE_STORAGE_KEY_SECRET','STAGING_QA_PASSWORD','STAGING_OPERATOR_SECRET']) {
    if (!env[key] || env[key].length < 32) throw Error('STAGING_GENERATED_SECRET_REQUIRED');
  }
  const allowed = new Set(['JWT_SECRET','PARTNER_PRIVATE_STORAGE_KEY_SECRET','STAGING_QA_PASSWORD','STAGING_OPERATOR_SECRET','DATABASE_URL','DIRECT_URL','STAGING_DATABASE_URL']);
  for (const [key,value] of Object.entries(env)) {
    if (value && /(?:SECRET|API_KEY|ACCESS_KEY|ACCESS_TOKEN|PRIVATE_KEY|CREDENTIALS?|PASSWORD|DATABASE_URL|DIRECT_URL|CONNECTION_STRING|SERVICE_ACCOUNT_JSON|SERVICE_ACCOUNT_BASE64)$/.test(key) && !allowed.has(key)) throw Error('STAGING_UNEXPECTED_CREDENTIAL');
  }
  const required = { OTP_PROVIDER:'mock', SMS_PROVIDER:'mock', PAYMENT_PROVIDER:'mock', PAYMENTS_PROVIDER:'mock', PAYMENTS_LIVE_ENABLED:'false', EMAIL_PROVIDER:'mock', WHATSAPP_PROVIDER:'mock', PUSH_PROVIDER:'mock', NOTIFICATION_PROVIDER:'mock', APPLICATION_EMAIL_NOTIFICATION_PROVIDER:'mock', APPLICATION_SMS_NOTIFICATION_PROVIDER:'mock', UTILITIES_ENABLED:'false', RIDES_SERVICE_ENABLED:'false', RIDES_PRODUCTION_ENABLED:'false', RIDES_AUTO_DISPATCH_ENABLED:'false', RIDE_IN_APP_CALL_ENABLED:'false', PARTNER_ONBOARDING_PAYMENT_ENABLED:'false', PRISMA_ACCELERATE_ENABLED:'false', PARTNER_PRIVATE_STORAGE_DRIVER:'local' };
  for (const [key,value] of Object.entries(required)) if (env[key] !== value) throw Error('STAGING_PROVIDER_POLICY_MISMATCH');
  return { databaseIdentity: createHash('sha256').update(db.hostname+db.pathname).digest('hex'), providers:'MOCK_ONLY', storage:'DEDICATED_DISK' };
}
function installHttpBoundary(env) {
  const hosts = new Set(['127.0.0.1','localhost',env.RENDER_EXTERNAL_HOSTNAME].filter(Boolean));
  const permitted = value => { try { return hosts.has(new URL(typeof value === 'string' || value instanceof URL ? value : value.url).hostname); } catch { return false; } };
  const original = globalThis.fetch;
  globalThis.fetch = (url, init) => permitted(url) ? original(url, init) : Promise.reject(Error('STAGING_EXTERNAL_HTTP_BLOCKED'));
  for (const protocol of ['http','https']) {
    const mod = require('node:'+protocol), request = mod.request;
    mod.request = function(url, ...args) {
      const host = typeof url === 'object' && !(url instanceof URL) ? (url.hostname || url.host || 'localhost').split(':')[0] : new URL(url).hostname;
      if (!hosts.has(host)) throw Error('STAGING_EXTERNAL_HTTP_BLOCKED');
      return request.call(this,url,...args);
    };
    mod.get = function(...args) { const req = mod.request(...args); req.end(); return req; };
  }
}
module.exports = { assertStaging, installHttpBoundary };
