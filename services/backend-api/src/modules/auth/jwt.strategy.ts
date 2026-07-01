import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { AccountStatus, UserRole } from "@prisma/client";
import { ExtractJwt, Strategy } from "passport-jwt";
import { AuthenticatedUser } from "../../common/interfaces/authenticated-user.interface";
import { UsersService } from "../users/users.service";

interface JwtPayload {
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

    if (!user || user.deletedAt || user.accountStatus !== AccountStatus.ACTIVE) {
      throw new UnauthorizedException("Authentication is no longer valid");
    }

    return {
      id: user.id,
      fullName: user.fullName,
      phoneNumber: user.phoneNumber,
      email: user.email,
      role: user.role,
      adminRole: user.adminRole,
      accountStatus: user.accountStatus,
      phoneVerified: user.phoneVerified
    };
  }
}

