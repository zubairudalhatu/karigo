import type { CallHandler, ExecutionContext } from "@nestjs/common";
import { firstValueFrom, of } from "rxjs";
import { ApiResponseInterceptor } from "./api-response.interceptor";

describe("ApiResponseInterceptor", () => {
  const context = {} as ExecutionContext;

  it("wraps controller data in the standard success shape", async () => {
    const interceptor = new ApiResponseInterceptor();
    const handler = { handle: () => of({ id: "123" }) } as CallHandler;

    await expect(firstValueFrom(interceptor.intercept(context, handler))).resolves.toEqual({
      success: true,
      message: "Request successful",
      data: { id: "123" }
    });
  });

  it("preserves an explicit message and data payload", async () => {
    const interceptor = new ApiResponseInterceptor();
    const handler = {
      handle: () => of({ message: "Created", data: { id: "123" } })
    } as CallHandler;

    await expect(firstValueFrom(interceptor.intercept(context, handler))).resolves.toEqual({
      success: true,
      message: "Created",
      data: { id: "123" }
    });
  });
});

