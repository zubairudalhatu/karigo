import { ArgumentsHost, BadRequestException } from "@nestjs/common";
import { AllExceptionsFilter } from "./all-exceptions.filter";

describe("AllExceptionsFilter", () => {
  it("returns the documented validation error shape", () => {
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    const host = {
      switchToHttp: () => ({
        getResponse: () => ({ status }),
        getRequest: () => ({ method: "POST", url: "/api/v1/example" })
      })
    } as ArgumentsHost;

    new AllExceptionsFilter().catch(
      new BadRequestException({ message: ["name must not be empty"] }),
      host
    );

    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith({
      success: false,
      message: "name must not be empty",
      error_code: "VALIDATION_ERROR",
      details: { errors: ["name must not be empty"] }
    });
  });
});
