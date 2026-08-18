import type { ApiRequestOptions } from "@karigo/config";

export function captainGetOptions(options: ApiRequestOptions = {}): ApiRequestOptions {
  return {
    retryOnNetworkFailure: true,
    retryOnTemporaryFailure: true,
    ...options
  };
}
