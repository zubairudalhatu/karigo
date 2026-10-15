import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { UserRole } from "@prisma/client";
import { ROLES_KEY } from "../decorators/roles.decorator";
import { AuthenticatedUser } from "../interfaces/authenticated-user.interface";

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass()
    ]);

    if (!roles?.length) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{ user?: AuthenticatedUser }>();
    // Customer-only APIs must not revive a deleted Customer role on a shared
    // identity which still legitimately signs in for onboarding/business work.
    if (roles.length === 1 && roles[0] === UserRole.CUSTOMER && request.user?.customerAccessDeletedAt) return false;
    return Boolean(request.user && roles.includes(request.user.role));
  }
}

