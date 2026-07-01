import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger
} from "@nestjs/common";
import type { Request, Response } from "express";
import { ApiErrorResponse } from "../interfaces/api-response.interface";

interface HttpExceptionBody {
  message?: string | string[];
  error?: string;
  error_code?: string;
  details?: unknown;
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();
    const request = context.getRequest<Request>();
    const isHttpException = exception instanceof HttpException;
    const status = isHttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const exceptionResponse = isHttpException ? exception.getResponse() : undefined;
    const body = this.toBody(exceptionResponse);
    const validationMessages = Array.isArray(body.message) ? body.message : undefined;
    const message =
      validationMessages?.[0] ??
      (typeof body.message === "string" ? body.message : undefined) ??
      (isHttpException ? exception.message : "Internal server error");
    const errorCode =
      body.error_code ??
      (validationMessages ? "VALIDATION_ERROR" : this.defaultErrorCode(status));

    if (!isHttpException) {
      this.logger.error(
        `${request.method} ${request.url}`,
        exception instanceof Error ? exception.stack : String(exception)
      );
    }

    const payload: ApiErrorResponse = {
      success: false,
      message,
      error_code: errorCode,
      details: body.details ?? (validationMessages ? { errors: validationMessages } : {})
    };

    response.status(status).json(payload);
  }

  private toBody(value: string | object | undefined): HttpExceptionBody {
    if (typeof value === "string") {
      return { message: value };
    }

    return (value ?? {}) as HttpExceptionBody;
  }

  private defaultErrorCode(status: number): string {
    return HttpStatus[status] ?? "INTERNAL_SERVER_ERROR";
  }
}

