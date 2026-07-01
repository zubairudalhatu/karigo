import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor
} from "@nestjs/common";
import { Observable, map } from "rxjs";
import { ApiSuccessResponse } from "../interfaces/api-response.interface";

interface ControllerResponse<T> {
  message?: string;
  data?: T;
}

@Injectable()
export class ApiResponseInterceptor<T>
  implements NestInterceptor<T | ControllerResponse<T>, ApiSuccessResponse<T>>
{
  intercept(
    _context: ExecutionContext,
    next: CallHandler<T | ControllerResponse<T>>
  ): Observable<ApiSuccessResponse<T>> {
    return next.handle().pipe(
      map((response) => {
        const isControllerResponse =
          typeof response === "object" &&
          response !== null &&
          ("data" in response || "message" in response);

        if (isControllerResponse) {
          const shaped = response as ControllerResponse<T>;
          return {
            success: true,
            message: shaped.message ?? "Request successful",
            data: shaped.data ?? (null as T)
          };
        }

        return {
          success: true,
          message: "Request successful",
          data: response as T
        };
      })
    );
  }
}

