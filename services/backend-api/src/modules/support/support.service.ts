import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { AdminRole, NotificationType, SupportTicketCategory, SupportTicketPriority, SupportTicketStatus, UserRole } from "@prisma/client";
import { randomBytes } from "crypto";
import { AdminAuditService } from "../../common/services/admin-audit.service";
import { PrismaService } from "../../prisma/prisma.service";
import { AddTicketMessageDto } from "./dto/add-ticket-message.dto";
import { AssignTicketDto } from "./dto/assign-ticket.dto";
import { CreateTicketDto } from "./dto/create-ticket.dto";
import { ListSupportTicketsQueryDto } from "./dto/list-support-tickets-query.dto";
import { UpdateTicketStatusDto } from "./dto/update-ticket-status.dto";
import { SupportStatusService } from "./support-status.service";
import { NotificationsService } from "../notifications/notifications.service";

@Injectable()
export class SupportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly statuses: SupportStatusService,
    private readonly audit: AdminAuditService,
    private readonly notifications: NotificationsService
  ) {}

  async create(userId: string, dto: CreateTicketDto) {
    const customer = await this.requireCustomer(userId);
    if (dto.orderId) {
      const order = await this.prisma.order.findFirst({ where: { id: dto.orderId, customerId: customer.id } });
      if (!order) throw new NotFoundException("Order not found");
    }
    const ticket = await this.prisma.supportTicket.create({
      data: {
        ticketNumber: `KGO-SUP-${Date.now()}-${randomBytes(2).toString("hex").toUpperCase()}`,
        customerId: customer.id,
        orderId: dto.orderId,
        category: dto.category,
        priority: this.defaultPriority(dto.category),
        subject: dto.subject,
        description: dto.description,
        status: SupportTicketStatus.OPEN
      },
      include: this.customerInclude()
    });
    await this.notifications.createNotification({ userId, title: "Support ticket created", message: `Ticket ${ticket.ticketNumber} was created.`, type: NotificationType.SUPPORT_TICKET_CREATED, entityType: "SupportTicket", entityId: ticket.id });
    return ticket;
  }

  async myTickets(userId: string) {
    const customer = await this.requireCustomer(userId);
    return this.prisma.supportTicket.findMany({
      where: { customerId: customer.id },
      include: this.customerInclude(),
      orderBy: { createdAt: "desc" }
    });
  }

  async customerDetail(userId: string, ticketId: string) {
    const customer = await this.requireCustomer(userId);
    const ticket = await this.prisma.supportTicket.findFirst({
      where: { id: ticketId, customerId: customer.id },
      include: this.customerInclude()
    });
    if (!ticket) throw new NotFoundException("Support ticket not found");
    return ticket;
  }

  async customerMessage(userId: string, ticketId: string, dto: AddTicketMessageDto) {
    const ticket = await this.customerDetail(userId, ticketId);
    if (ticket.status === SupportTicketStatus.CLOSED) throw new BadRequestException("Closed tickets cannot accept messages");
    return this.prisma.$transaction(async (tx) => {
      const message = await tx.supportTicketMessage.create({
        data: { ticketId, senderUserId: userId, senderRole: "CUSTOMER", message: dto.message, isInternalNote: false }
      });
      if (ticket.status === SupportTicketStatus.WAITING_FOR_CUSTOMER) {
        await tx.supportTicket.update({ where: { id: ticketId }, data: { status: SupportTicketStatus.IN_REVIEW } });
      }
      return message;
    });
  }

  adminList(query: ListSupportTicketsQueryDto) {
    return this.prisma.supportTicket.findMany({
      where: {
        ...(query.status ? { status: query.status } : {}),
        ...(query.category ? { category: query.category } : {}),
        ...(query.priority ? { priority: query.priority } : {}),
        ...(query.assignedAdminId ? { assignedAdminId: query.assignedAdminId } : {}),
        ...((query.dateFrom || query.dateTo) ? { createdAt: {
          ...(query.dateFrom ? { gte: new Date(query.dateFrom) } : {}),
          ...(query.dateTo ? { lte: new Date(query.dateTo) } : {})
        } } : {})
      },
      include: this.adminInclude(),
      orderBy: { createdAt: "desc" }
    });
  }

  async adminDetail(ticketId: string) {
    const ticket = await this.prisma.supportTicket.findUnique({ where: { id: ticketId }, include: this.adminInclude() });
    if (!ticket) throw new NotFoundException("Support ticket not found");
    return ticket;
  }

  async assign(adminUserId: string, ticketId: string, dto: AssignTicketDto) {
    await this.adminDetail(ticketId);
    const assignee = await this.prisma.user.findFirst({
      where: {
        id: dto.adminUserId,
        role: UserRole.ADMIN,
        adminRole: { in: [AdminRole.SUPER_ADMIN, AdminRole.OPERATIONS_ADMIN, AdminRole.SUPPORT_AGENT] }
      }
    });
    if (!assignee) throw new BadRequestException("Support officer not found");
    const ticket = await this.prisma.supportTicket.update({
      where: { id: ticketId },
      data: { assignedAdminId: assignee.id, status: SupportTicketStatus.IN_REVIEW },
      include: this.adminInclude()
    });
    await this.audit.record(adminUserId, "support.ticket.assigned", "SupportTicket", ticketId, { assignedAdminId: assignee.id });
    await this.notifications.createNotification({ userId: assignee.id, title: "Support ticket assigned", message: `Ticket ${ticket.ticketNumber} was assigned to you.`, type: NotificationType.SUPPORT_TICKET_UPDATED, entityType: "SupportTicket", entityId: ticketId });
    return ticket;
  }

  async updateStatus(adminUserId: string, ticketId: string, dto: UpdateTicketStatusDto) {
    const ticket = await this.adminDetail(ticketId);
    this.statuses.assertTransition(ticket.status, dto.status);
    const updated = await this.prisma.supportTicket.update({
      where: { id: ticketId },
      data: {
        status: dto.status,
        ...(dto.priority ? { priority: dto.priority } : {}),
        ...(dto.status === SupportTicketStatus.CLOSED ? { closedAt: new Date() } : { closedAt: null })
      },
      include: this.adminInclude()
    });
    await this.audit.record(adminUserId, "support.ticket.status_changed", "SupportTicket", ticketId, {
      previousStatus: ticket.status, status: dto.status, priority: dto.priority
    });
    const customer = await this.prisma.customerProfile.findUnique({ where: { id: ticket.customerId }, select: { userId: true } });
    if (customer) await this.notifications.createNotification({ userId: customer.userId, title: "Support ticket updated", message: `Ticket ${ticket.ticketNumber} is now ${dto.status}.`, type: NotificationType.SUPPORT_TICKET_UPDATED, entityType: "SupportTicket", entityId: ticketId });
    return updated;
  }

  async adminMessage(adminUserId: string, ticketId: string, dto: AddTicketMessageDto) {
    const ticket = await this.adminDetail(ticketId);
    if (ticket.status === SupportTicketStatus.CLOSED) throw new BadRequestException("Reopen the ticket before adding messages");
    const message = await this.prisma.supportTicketMessage.create({
      data: {
        ticketId,
        senderUserId: adminUserId,
        senderRole: "ADMIN",
        message: dto.message,
        isInternalNote: dto.isInternalNote ?? false
      }
    });
    await this.audit.record(adminUserId, "support.ticket.message_added", "SupportTicket", ticketId, {
      messageId: message.id, isInternalNote: message.isInternalNote
    });
    return message;
  }

  private requireCustomer(userId: string) {
    return this.prisma.customerProfile.findUnique({ where: { userId } }).then((customer) => {
      if (!customer) throw new NotFoundException("Customer profile not found");
      return customer;
    });
  }

  private defaultPriority(category: SupportTicketCategory): SupportTicketPriority {
    return ([
      SupportTicketCategory.PAYMENT_ISSUE,
      SupportTicketCategory.REFUND_REQUEST,
      SupportTicketCategory.RIDER_ISSUE
    ] as SupportTicketCategory[])
      .includes(category) ? SupportTicketPriority.HIGH : SupportTicketPriority.MEDIUM;
  }

  private customerInclude() {
    return {
      order: { select: { id: true, orderNumber: true, orderStatus: true, paymentStatus: true } },
      messages: { where: { isInternalNote: false }, orderBy: { createdAt: "asc" as const } }
    };
  }

  private adminInclude() {
    return {
      customer: { select: { user: { select: { fullName: true, phoneNumber: true, email: true } } } },
      assignedAdmin: { select: { id: true, fullName: true, adminRole: true } },
      order: {
        select: {
          id: true, orderNumber: true, orderStatus: true, paymentStatus: true,
          vendor: { select: { id: true, businessName: true } },
          rider: { select: { id: true, riderCode: true } },
          payments: { select: { id: true, paymentStatus: true, amount: true, gateway: true } }
        }
      },
      messages: { orderBy: { createdAt: "asc" as const } }
    };
  }
}
