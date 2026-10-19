import { requiredMobile } from "../../common/utils/required-mobile";
import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { AccountStatus, UserRole } from "@prisma/client";
import { ExtractJwt, Strategy } from "passport-jwt";
import { AuthenticatedUser } from "../../common/interfaces/authenticated-user.interface";
import { UsersService } from "../users/users.service";
import { CAPTAIN_ONBOARDING_SCOPE } from "../../common/decorators/captain-onboarding.decorator";

interface JwtPayload {
  scope?: string;
  sub: string;
  role: UserRole;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private readonly usersService: UsersService
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>("JWT_SECRET")
    });
  }

  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    const user = await this.usersService.findByIdForAuth(payload.sub);

    const onboarding = payload.scope === CAPTAIN_ONBOARDING_SCOPE;
    if ((payload.scope && !onboarding) || !user || user.deletedAt || user.adminRole === "RESTORE_GOVERNANCE" ||
        (onboarding ? !(await this.usersService.canUseCaptainOnboarding(user.id)) : user.accountStatus !== AccountStatus.ACTIVE)) {
      throw new UnauthorizedException("Authentication is no longer valid");
    }

    return {
      ...(onboarding ? { sessionScope: CAPTAIN_ONBOARDING_SCOPE } : {}),
      id: user.id,
      fullName: user.fullName,
      phoneNumber: requiredMobile(user.phoneNumber),
      email: user.email,
      role: user.role,
      adminRole: user.adminRole,
      accountStatus: user.accountStatus,
      phoneVerified: user.phoneVerified,
      customerAccessDeletedAt: user.customerAccessDeletedAt
    };
  }
}

