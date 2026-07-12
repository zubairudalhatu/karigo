import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { AdminRole, UserRole } from "@prisma/client";
import { AdminRoles } from "../../common/decorators/admin-roles.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { AdminRolesGuard } from "../../common/guards/admin-roles.guard";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { AuthenticatedUser } from "../../common/interfaces/authenticated-user.interface";
import { CreateWalletAdjustmentDto } from "./dto/create-wallet-adjustment.dto";
import { ListAdminWalletsQueryDto } from "./dto/list-admin-wallets-query.dto";
import { ListWalletLedgerQueryDto } from "./dto/list-wallet-ledger-query.dto";
import { WalletService } from "./wallet.service";

const WALLET_ADMINS = [AdminRole.SUPER_ADMIN, AdminRole.OPERATIONS_ADMIN, AdminRole.FINANCE_OFFICER];

@ApiTags("Customer Wallet")
@ApiBearerAuth()
@Controller("wallet")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.CUSTOMER)
export class WalletController {
  constructor(private readonly wallet: WalletService) {}

  @Get()
  @ApiOperation({ summary: "Get the authenticated customer's wallet summary" })
  async summary(@CurrentUser() user: AuthenticatedUser) {
    return { message: "Wallet retrieved", data: await this.wallet.customerWallet(user.id) };
  }

  @Get("transactions")
  @ApiOperation({ summary: "List the authenticated customer's wallet ledger entries" })
  async transactions(@CurrentUser() user: AuthenticatedUser, @Query() query: ListWalletLedgerQueryDto) {
    return { message: "Wallet ledger retrieved", data: await this.wallet.customerLedger(user.id, query) };
  }
}

@ApiTags("Admin Wallets")
@ApiBearerAuth()
@Controller("admin/wallets")
@UseGuards(JwtAuthGuard, RolesGuard, AdminRolesGuard)
@Roles(UserRole.ADMIN)
@AdminRoles(...WALLET_ADMINS)
export class AdminWalletController {
  constructor(private readonly wallet: WalletService) {}

  @Get()
  @ApiOperation({ summary: "List customer wallets for admin review" })
  async list(@Query() query: ListAdminWalletsQueryDto) {
    return { message: "Customer wallets retrieved", data: await this.wallet.adminList(query) };
  }

  @Get(":walletId")
  @ApiOperation({ summary: "Get a customer wallet and recent ledger entries for admin review" })
  async detail(@Param("walletId", ParseUUIDPipe) walletId: string) {
    return { message: "Customer wallet retrieved", data: await this.wallet.adminDetail(walletId) };
  }

  @Post(":walletId/adjustments")
  @ApiOperation({ summary: "Create a controlled admin wallet ledger adjustment" })
  async adjustment(
    @CurrentUser() user: AuthenticatedUser,
    @Param("walletId", ParseUUIDPipe) walletId: string,
    @Body() dto: CreateWalletAdjustmentDto
  ) {
    return { message: "Wallet adjustment recorded", data: await this.wallet.adminCreateAdjustment(user.id, walletId, dto) };
  }
}
