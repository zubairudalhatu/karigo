import { Controller, Delete, Get, Param, ParseUUIDPipe, Post, UseGuards } from "@nestjs/common";
import { AdminRole, UserRole } from "@prisma/client";
import { AdminRoles } from "../../common/decorators/admin-roles.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { AdminRolesGuard } from "../../common/guards/admin-roles.guard";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { AuthenticatedUser } from "../../common/interfaces/authenticated-user.interface";
import { InternalRideQaService } from "./internal-ride-qa.service";

@Controller("admin/taxi/internal-qa")
@UseGuards(JwtAuthGuard, RolesGuard, AdminRolesGuard)
@Roles(UserRole.ADMIN)
@AdminRoles(AdminRole.SUPER_ADMIN)
export class InternalRideQaController {
  constructor(private readonly qa: InternalRideQaService) {}
  @Post() create(@CurrentUser() user: AuthenticatedUser) { return this.qa.create(user.id); }
  @Get(":tripId") status(@CurrentUser() user: AuthenticatedUser, @Param("tripId", ParseUUIDPipe) id: string) { return this.qa.status(user.id, id); }
  @Post(":tripId/offer") offer(@CurrentUser() user: AuthenticatedUser, @Param("tripId", ParseUUIDPipe) id: string) { return this.qa.offer(user.id, id); }
  // Cleanup remains usable after the feature flag is switched OFF or a window expires.
  @Delete(":tripId") cleanup(@CurrentUser() user: AuthenticatedUser, @Param("tripId", ParseUUIDPipe) id: string) { return this.qa.cleanup(user.id, id); }
}
