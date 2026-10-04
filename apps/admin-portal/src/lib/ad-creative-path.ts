const CREATIVE_ASSET_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isCreativeAssetId(value: string) {
  return CREATIVE_ASSET_ID.test(value);
}

export function creativePreviewSrc(value?: string | null): string | undefined {
  if (!value) return undefined;
  const match = /^\/ads\/creative\/([^/]+)$/.exec(value);
  if (match && isCreativeAssetId(match[1])) return `/api/private-media/${match[1]}`;
  return value.startsWith("/") ? `/api/bff${value}` : value;
}
