const PRODUCTION_HOSTS = new Set(['karigo-8htn.onrender.com', 'api.karigo.com.ng', 'api.karigo.ng']);
function partnerApiTarget(staging, env) {
  const value = staging ? env.PARTNER_STAGING_API_BASE_URL : env.EXPO_PUBLIC_API_BASE_URL;
  if (!value) throw new Error(staging ? 'Partner staging requires PARTNER_STAGING_API_BASE_URL.' : 'Partner API URL is required.');
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) throw new Error('Partner requires a credential-free HTTPS API URL.');
  if (staging && (PRODUCTION_HOSTS.has(url.hostname.toLowerCase()))) throw new Error('Partner staging cannot target Production.');
  return value.replace(/\/$/, '');
}
function runtimePartnerApiTarget(extra) {
  if (!extra || typeof extra.apiBaseUrl !== 'string' || !extra.apiBaseUrl.trim()) throw new Error('Partner API target is missing; refusing fallback.');
  return partnerApiTarget(extra.appVariant === 'staging', { PARTNER_STAGING_API_BASE_URL: extra.apiBaseUrl, EXPO_PUBLIC_API_BASE_URL: extra.apiBaseUrl });
}
module.exports = { partnerApiTarget, runtimePartnerApiTarget };
