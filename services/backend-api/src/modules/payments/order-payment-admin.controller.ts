import {
  Body,
  Controller,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from "@nestjs/common";
import { IsInt, Matches, Max, Min } from "class-validator";
import { AdminRole, UserRole } from "@prisma/client";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { AdminRoles } from "../../common/decorators/admin-roles.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { AdminRolesGuard } from "../../common/guards/admin-roles.guard";
import { AdminAuditService } from "../../common/services/admin-audit.service";
import { AuthenticatedUser } from "../../common/interfaces/authenticated-user.interface";
import { OrderPaymentRuntime } from "./order-payment-runtime.service";

class OrderRefundDto {
  @IsInt() @Min(1) @Max(2147483647) amountMinor!: number;
  @Matches(/^[A-Za-z0-9:._-]{12,128}$/) idempotencyKey!: string;
}

@Controller("admin/order-payments")
@UseGuards(JwtAuthGuard, RolesGuard, AdminRolesGuard)
@Roles(UserRole.ADMIN)
@AdminRoles(AdminRole.SUPER_ADMIN, AdminRole.FINANCE_OFFICER)
export class OrderPaymentAdminController {
  constructor(
    private readonly runtime: OrderPaymentRuntime,
    private readonly audit: AdminAuditService,
  ) {}
  @Post(":id/refunds")
  async refund(
    @CurrentUser() actor: AuthenticatedUser,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() body: OrderRefundDto,
  ) {
    const row = await this.runtime.refund(
      id,
      body.amountMinor,
      body.idempotencyKey,
    );
    await this.audit.record(
      actor.id,
      "order_payment.refund.requested",
      "OrderPaymentAttempt",
      id,
      { refundId: row.id, amountMinor: row.amountMinor, state: row.state },
    );
    return {
      data: {
        id: row.id,
        amountMinor: row.amountMinor,
        state: row.state,
        providerReference: row.providerReference,
        createdAt: row.createdAt,
      },
    };
  }
  @Post("events/:id/retry")
  async retry(
    @CurrentUser() actor: AuthenticatedUser,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    const result = await this.runtime.retryEvent(id);
    await this.audit.record(
      actor.id,
      "order_payment.event.retried",
      "OrderPaymentProviderEvent",
      id,
      {},
    );
    return { data: result };
  }
  @Post(":id/reconcile")
  async reconcile(
    @CurrentUser() actor: AuthenticatedUser,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    const result = await this.runtime.reconcile(id);
    await this.audit.record(
      actor.id,
      "order_payment.reconciliation.inspected",
      "OrderPaymentAttempt",
      id,
      { discrepancies: result.discrepancies },
    );
    return { data: result };
  }
}
