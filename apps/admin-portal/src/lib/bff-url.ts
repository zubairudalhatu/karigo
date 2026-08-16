export function buildBffUpstreamUrl(baseUrl: string, path: string, search: string): URL {
  const normalizedBaseUrl = baseUrl.replace(/\/+$/, "");
  const normalizedPath = path.replace(/^\/+/, "");
  const upstreamUrl = new URL(`${normalizedBaseUrl}/${normalizedPath}`);

  upstreamUrl.search = search;
  return upstreamUrl;
}
