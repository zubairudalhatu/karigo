const APPROVED_CREATIVE_PATH = /^\/ads\/creative\/([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/i;
const ASSET_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function creativeAssetId(source: string | null | undefined) {
  return source?.match(APPROVED_CREATIVE_PATH)?.[1] ?? null;
}

export function isCreativeAssetId(value: string) {
  return ASSET_ID.test(value);
}

export function customerPrivateCreativePath(source: string | null | undefined) {
  const id = creativeAssetId(source);
  return id ? `/api/private-media/${id}` : null;
}
