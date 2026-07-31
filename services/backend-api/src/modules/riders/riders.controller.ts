import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query, UploadedFile, UseGuards, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { AdminRole, UserRole } from "@prisma/client";
import { AdminRoles } from "../../common/decorators/admin-roles.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { AdminRolesGuard } from "../../common/guards/admin-roles.guard";
import { ApprovedCaptainGuard } from "../../common/guards/approved-captain.guard";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { AuthenticatedUser } from "../../common/interfaces/authenticated-user.interface";
import { CaptainUploadFile } from "./captain-upload-storage.service";
import { CaptainApplicationDocumentUploadDto } from "./dto/captain-application-document-upload.dto";
import { CreateDeliveryCaptainApplicationDto } from "./dto/create-delivery-captain-application.dto";
import { DeliveryCaptainApplicationStatusQueryDto } from "./dto/delivery-captain-application-status-query.dto";
import { ListDeliveryCaptainApplicationsQueryDto } from "./dto/list-delivery-captain-applications-query.dto";
import { ReviewDeliveryCaptainApplicationDto } from "./dto/review-delivery-captain-application.dto";
import { UpdateRiderProfileDto } from "./dto/update-rider-profile.dto";
import { RidersService } from "./riders.service";

const DELIVERY_CAPTAIN_APPLICATION_ADMINS = [
  AdminRole.SUPER_ADMIN,
  AdminRole.OPERATIONS_ADMIN,
  AdminRole.RIDER_MANAGER,
  AdminRole.SUPPORT_AGENT
];

@ApiTags("Delivery Captain Applications")
@Controller("delivery-captain-applications")
export class DeliveryCaptainApplicationsController {
  constructor(private readonly ridersService: RidersService) {}

  @Post()
  @ApiOperation({ summary: "Submit a public Delivery Captain application for Kano or Abuja launch review" })
  async create(@Body() dto: CreateDeliveryCaptainApplicationDto) {
    return { message: "Delivery Captain application submitted", data: await this.ridersService.createDeliveryCaptainApplication(dto) };
  }

  @Get("status")
  @ApiOperation({ summary: "Check public Delivery Captain application status by phone number" })
  async status(@Query() query: DeliveryCaptainApplicationStatusQueryDto) {
    return { message: "Delivery Captain application status retrieved", data: await this.ridersService.deliveryCaptainApplicationStatus(query) };
  }

  @Post("me")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Submit a Delivery Captain application for the authenticated KariGO account" })
  async createForCurrentUser(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateDeliveryCaptainApplicationDto) {
    return { message: "Delivery Captain application submitted", data: await this.ridersService.createDeliveryCaptainApplicationForUser(user.id, dto) };
  }

  @Get("me")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Check the authenticated user's Delivery Captain application status" })
  async statusForCurrentUser(@CurrentUser() user: AuthenticatedUser) {
    return { message: "Delivery Captain application status retrieved", data: await this.ridersService.currentUserDeliveryCaptainApplicationStatus(user.id) };
  }
}

@ApiTags("Admin Delivery Captain Applications")
@ApiBearerAuth()
@Controller("admin/delivery-captain-applications")
@UseGuards(JwtAuthGuard, RolesGuard, AdminRolesGuard)
@Roles(UserRole.ADMIN)
@AdminRoles(...DELIVERY_CAPTAIN_APPLICATION_ADMINS)
export class AdminDeliveryCaptainApplicationsController {
  constructor(private readonly ridersService: RidersService) {}

  @Get()
  @ApiOperation({ summary: "List Delivery Captain applications" })
  async list(@Query() query: ListDeliveryCaptainApplicationsQueryDto) {
    return { message: "Delivery Captain applications retrieved", data: await this.ridersService.listDeliveryCaptainApplications(query) };
  }

  @Get(":applicationId")
  @ApiOperation({ summary: "Get Delivery Captain application detail" })
  async detail(@Param("applicationId", ParseUUIDPipe) applicationId: string) {
    return { message: "Delivery Captain application retrieved", data: await this.ridersService.deliveryCaptainApplicationDetail(applicationId) };
  }

  @Get(":applicationId/documents/:documentId/view")
  @ApiOperation({ summary: "Create a short-lived secure view URL for a Captain application document" })
  async documentView(
    @Param("applicationId", ParseUUIDPipe) applicationId: string,
    @Param("documentId", ParseUUIDPipe) documentId: string
  ) {
    return { message: "Captain document view URL created", data: await this.ridersService.adminCaptainDocumentViewUrl(applicationId, documentId) };
  }

  @Patch(":applicationId/review")
  @ApiOperation({ summary: "Review a Delivery Captain application without activating dispatch or payouts" })
  async review(@CurrentUser() user: AuthenticatedUser, @Param("applicationId", ParseUUIDPipe) applicationId: string, @Body() dto: ReviewDeliveryCaptainApplicationDto) {
    return { message: "Delivery Captain application reviewed", data: await this.ridersService.reviewDeliveryCaptainApplication(user.id, applicationId, dto) };
  }
}

@ApiTags("Riders")
@ApiBearerAuth()
@Controller("riders")
@UseGuards(JwtAuthGuard, ApprovedCaptainGuard)
export class RidersController {
  constructor(private readonly ridersService: RidersService) {}

  @Get("me")
  @ApiOperation({ summary: "Get the authenticated rider profile" })
  async me(@CurrentUser() user: AuthenticatedUser) {
    return { message: "Rider profile retrieved", data: await this.ridersService.me(user.id) };
  }

  @Patch("me")
  @ApiOperation({ summary: "Update the authenticated rider profile" })
  async update(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpdateRiderProfileDto) {
    return { message: "Rider profile updated", data: await this.ridersService.update(user.id, dto) };
  }
}

@ApiTags("Captain Access")
@ApiBearerAuth()
@Controller("captain")
@UseGuards(JwtAuthGuard)
export class CaptainAccessController {
  constructor(private readonly ridersService: RidersService) {}

  @Get("access")
  @ApiOperation({ summary: "Resolve safe Captain onboarding and operational access for the authenticated account" })
  async access(@CurrentUser() user: AuthenticatedUser) {
    return { message: "Captain access resolved", data: await this.ridersService.resolveCaptainAccess(user.id) };
  }

  @Post("application-documents/uploads")
  @UseInterceptors(FileInterceptor("file", { limits: { fileSize: 10 * 1024 * 1024 } }))
  @ApiOperation({ summary: "Upload a private Captain application document for the authenticated applicant" })
  async uploadDocument(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CaptainApplicationDocumentUploadDto,
    @UploadedFile() file?: CaptainUploadFile
  ) {
    return { message: "Captain application document uploaded", data: await this.ridersService.uploadCaptainApplicationDocument(user.id, dto.documentType, file) };
  }

  @Delete("application-documents/:documentId")
  @ApiOperation({ summary: "Remove an unsubmitted Captain application upload owned by the authenticated applicant" })
  async removeDocument(@CurrentUser() user: AuthenticatedUser, @Param("documentId", ParseUUIDPipe) documentId: string) {
    return { message: "Captain application document removed", data: await this.ridersService.removeCaptainApplicationDocument(user.id, documentId) };
  }
}
