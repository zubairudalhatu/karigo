export interface ApiSuccessResponse<T> {
  success: true;
  message: string;
  data: T;
}

export interface ApiErrorResponse {
  success: false;
  message: string;
  error_code: string;
  details?: unknown;
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

export interface PaginatedData<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
}

export class KariGoApiError extends Error {
  constructor(
    message: string,
    readonly errorCode = "API_REQUEST_FAILED",
    readonly status?: number,
    readonly details?: unknown
  ) {
    super(message);
    this.name = "KariGoApiError";
  }
}
