import { ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { CAPTAIN_ONBOARDING_ALLOWED, CAPTAIN_ONBOARDING_SCOPE } from "../decorators/captain-onboarding.decorator";
import { AuthenticatedUser } from "../interfaces/authenticated-user.interface";

@Injectable()
export class JwtAuthGuard extends AuthGuard("jwt") {
  handleRequest<TUser = AuthenticatedUser>(err: unknown, user: TUser, info: unknown, context: ExecutionContext): TUser {
    const authenticated = super.handleRequest<TUser>(err, user, info, context);
    if ((authenticated as AuthenticatedUser).sessionScope === CAPTAIN_ONBOARDING_SCOPE &&
        Reflect.getMetadata(CAPTAIN_ONBOARDING_ALLOWED, context.getHandler()) !== true) {
      throw new ForbiddenException("Captain onboarding session cannot access this endpoint.");
    }
    return authenticated;
  }
}

