import { BadRequestException, NotFoundException } from "@nestjs/common";
import { ServiceProviderApplicationStatus, ServiceProviderRequestStatus, ServiceProviderStatus, ServiceProviderType, SmeServicesPilotDecisionStatus, SmeServicesPilotInvitationChannel, SmeServicesPilotParticipantStatus, SmeServicesPilotParticipantType } from "@prisma/client";
import { AdminAuditService } from "../../common/services/admin-audit.service";
import { PrismaService } from "../../prisma/prisma.service";
import { ServiceProviderRequestsService } from "./service-provider-requests.service";

const now = new Date("2026-07-11T12:00:00.000Z");
const request = {
  id: "00000000-0000-0000-0000-000000000701",
  requestNumber: "KGO-SVC-001",
  customerId: "customer-1",
  serviceType: ServiceProviderType.PLUMBER,
  serviceLabel: "Plumber",
  serviceAddressId: "address-1",
  description: "Fix leaking kitchen sink",
  contactPhone: "+2348011111111",
  preferredDate: "2026-07-12",
  preferredTimeWindow: "Morning",
  customerNote: "Call before arrival",
  status: ServiceProviderRequestStatus.SUBMITTED,
  readinessOnly: false,
  adminNote: null,
  customerUpdateNote: null,
  createdAt: now,
  updatedAt: now,
  assignedProviderId: null,
  assignedByAdminId: null,
  assignmentNote: null,
  assignedAt: null,
  assignedProvider: null,
  assignedByAdmin: null,
  customer: {
    id: "customer-1",
    user: { id: "user-1", fullName: "Demo Customer", phoneNumber: "+2348011111111", email: "customer@karigo.local" }
  },
  serviceAddress: {
    id: "address-1",
    label: "Home",
    addressLine: "Nasarawa GRA",
    city: "Kano",
    state: "Kano",
    country: "Nigeria"
  }
};

const provider = {
  id: "00000000-0000-0000-0000-000000000801",
  providerCode: "KGO-SP-001",
  fullName: "Demo Plumber",
  businessName: "Demo Plumbing",
  serviceType: ServiceProviderType.PLUMBER,
  phoneNumber: "+2348022222222",
  email: "provider@karigo.local",
  city: "Kano",
  state: "Kano",
  serviceAreas: ["Nasarawa GRA", "Bompai"],
  status: ServiceProviderStatus.APPROVED,
  readinessOnly: false,
  notes: null,
  verificationNote: "ID checked",
  createdAt: now,
  updatedAt: now
};

const readinessItem = {
  id: "00000000-0000-0000-0000-000000000a01",
  key: "pilot_scope_confirmed",
  category: "Operations",
  label: "Pilot scope confirmed",
  description: "Pilot zones, invited customer group, supported service categories and internal owners are agreed.",
  sortOrder: 10,
  isRequired: true,
  isCompleted: false,
  note: null,
  updatedByAdminId: null,
  completedAt: null,
  createdAt: now,
  updatedAt: now
};

const launchDecision = {
  id: "00000000-0000-0000-0000-000000000b01",
  decisionStatus: SmeServicesPilotDecisionStatus.CONDITIONAL_GO,
  decisionTitle: "Proceed with limited internal pilot",
  decisionSummary: "Operations can invite internal testers after final account checks.",
  conditions: "Keep provider matching manual.",
  blockers: null,
  readinessStatusSnapshot: "NOT_READY",
  requiredCompletedSnapshot: 0,
  requiredTotalSnapshot: 1,
  optionalCompletedSnapshot: 0,
  optionalTotalSnapshot: 0,
  approvedProvidersSnapshot: 2,
  pendingProviderApplicationsSnapshot: 4,
  activeRequestsSnapshot: 6,
  recordedByAdminId: "admin-user",
  recordedAt: now,
  createdAt: now,
  updatedAt: now
};

const pilotParticipant = {
  id: "00000000-0000-0000-0000-000000000c01",
  participantType: SmeServicesPilotParticipantType.CUSTOMER,
  status: SmeServicesPilotParticipantStatus.READY_TO_INVITE,
  displayName: "Demo Pilot Customer",
  phoneNumber: "+2348011111111",
  email: "pilot.customer@karigo.local",
  organization: null,
  city: "Kano",
  pilotZone: "Nasarawa GRA",
  relatedUserId: "00000000-0000-0000-0000-000000000d01",
  relatedProviderId: null,
  invitationChannel: SmeServicesPilotInvitationChannel.PHONE,
  invitationNote: "Call manually after signoff",
  internalNotes: "Internal pilot participant only",
  consentConfirmed: true,
  safetyBriefingCompleted: false,
  invitedAt: null,
  confirmedAt: null,
  createdByAdminId: "admin-user",
  updatedByAdminId: "admin-user",
  createdAt: now,
  updatedAt: now
};

describe("ServiceProviderRequestsService admin operations", () => {
  const prisma = {
    customerProfile: { findUnique: jest.fn() },
    address: { findFirst: jest.fn() },
    serviceProviderRequest: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      count: jest.fn()
    },
    serviceProvider: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      count: jest.fn()
    },
    serviceProviderApplication: {
      findMany: jest.fn(),
      count: jest.fn()
    },
    smeServicesPilotReadinessItem: {
      upsert: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn()
    },
    smeServicesPilotLaunchDecision: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn()
    },
    smeServicesPilotParticipant: {
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn()
    },
    adminAuditLog: { findMany: jest.fn() }
  };
  const audit = { record: jest.fn() };
  const service = new ServiceProviderRequestsService(
    prisma as unknown as PrismaService,
    audit as unknown as AdminAuditService
  );

  beforeEach(() => {
    jest.clearAllMocks();
    audit.record.mockResolvedValue({});
  });

  function mockAdminSummaryQueries() {
    prisma.serviceProviderRequest.count
      .mockResolvedValueOnce(8)
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(0);
    prisma.serviceProviderApplication.count
      .mockResolvedValueOnce(7)
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(1);
    prisma.serviceProvider.count
      .mockResolvedValueOnce(5)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(1);
    prisma.serviceProviderRequest.findMany.mockResolvedValue([request]);
    prisma.serviceProviderApplication.findMany.mockResolvedValue([{
      id: "00000000-0000-0000-0000-000000000901",
      applicationReference: "KGO-SPA-2026-001",
      fullName: "Demo Applicant",
      businessName: "Demo Services",
      serviceType: ServiceProviderType.PLUMBER,
      status: ServiceProviderApplicationStatus.SUBMITTED,
      submittedAt: now,
      updatedAt: now
    }]);
    prisma.serviceProvider.findMany.mockResolvedValue([provider]);
  }

  it("lists SME Services requests with safe filters and summary counts", async () => {
    prisma.serviceProviderRequest.findMany.mockResolvedValue([request]);
    prisma.serviceProviderRequest.count
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0);

    const result = await service.adminList({
      status: ServiceProviderRequestStatus.SUBMITTED,
      serviceType: ServiceProviderType.PLUMBER,
      search: "Demo"
    });

    expect(prisma.serviceProviderRequest.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        status: ServiceProviderRequestStatus.SUBMITTED,
        serviceType: ServiceProviderType.PLUMBER,
        OR: expect.any(Array)
      }),
      take: 200
    }));
    expect(result.summary).toMatchObject({ total: 1, submitted: 1, underReview: 0 });
    expect(result.items[0]).toMatchObject({
      requestNumber: "KGO-SVC-001",
      serviceLabel: "Plumber",
      customer: request.customer
    });
  });

  it("returns an admin operations summary across requests, applications and providers", async () => {
    prisma.serviceProviderRequest.count
      .mockResolvedValueOnce(8)
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(0);
    prisma.serviceProviderApplication.count
      .mockResolvedValueOnce(7)
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(1);
    prisma.serviceProvider.count
      .mockResolvedValueOnce(5)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(1);
    prisma.serviceProviderRequest.findMany.mockResolvedValue([request]);
    prisma.serviceProviderApplication.findMany.mockResolvedValue([{
      id: "00000000-0000-0000-0000-000000000901",
      applicationReference: "KGO-SPA-2026-001",
      fullName: "Demo Applicant",
      businessName: "Demo Services",
      serviceType: ServiceProviderType.PLUMBER,
      status: ServiceProviderApplicationStatus.SUBMITTED,
      submittedAt: now,
      updatedAt: now
    }]);
    prisma.serviceProvider.findMany.mockResolvedValue([provider]);

    const result = await service.adminSummary();

    expect(result.requests).toMatchObject({ total: 8, active: 6, submitted: 2, completed: 1 });
    expect(result.providerApplications).toMatchObject({ total: 7, pending: 4, convertedToProvider: 1 });
    expect(result.providers).toMatchObject({ total: 5, approved: 2, readinessOnly: 1 });
    expect(result.recent.requests[0]).toMatchObject({
      reference: "KGO-SVC-001",
      customerName: "Demo Customer",
      status: ServiceProviderRequestStatus.SUBMITTED
    });
    expect(result.recent.requests[0]).not.toHaveProperty("contactPhone");
    expect(result.recent.providers[0]).not.toHaveProperty("phoneNumber");
    expect(result.guardrails).toMatchObject({
      liveDispatchEnabled: false,
      livePaymentsEnabled: false,
      providerLoginEnabled: false,
      providerPayoutEnabled: false,
      medicalBookingEnabled: false
    });
  });

  it("generates a management-ready pilot report without private contact details", async () => {
    prisma.serviceProviderRequest.count
      .mockResolvedValueOnce(8)
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(0);
    prisma.serviceProviderApplication.count
      .mockResolvedValueOnce(7)
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(1);
    prisma.serviceProvider.count
      .mockResolvedValueOnce(5)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(1);
    prisma.serviceProviderRequest.findMany.mockResolvedValue([request]);
    prisma.serviceProviderApplication.findMany.mockResolvedValue([{
      id: "00000000-0000-0000-0000-000000000901",
      applicationReference: "KGO-SPA-2026-001",
      fullName: "Demo Applicant",
      businessName: "Demo Services",
      serviceType: ServiceProviderType.PLUMBER,
      status: ServiceProviderApplicationStatus.SUBMITTED,
      submittedAt: now,
      updatedAt: now
    }]);
    prisma.serviceProvider.findMany.mockResolvedValue([provider]);

    const result = await service.adminReport();

    expect(result.title).toBe("KariGO SME Services Pilot Operations Report");
    expect(result.filename).toMatch(/^karigo-sme-services-pilot-report-\d{8}T\d{6}Z\.md$/);
    expect(result.format).toBe("markdown");
    expect(result.mimeType).toBe("text/markdown");
    expect(result.markdown).toContain("# KariGO SME Services Pilot Operations Report");
    expect(result.markdown).toContain("- Active customer requests: 6");
    expect(result.markdown).toContain("- Live dispatch: Disabled");
    expect(result.markdown).toContain("internal pilot monitoring and management review only");
    expect(result.markdown).not.toContain("+234");
    expect(result.markdown).not.toContain("provider@karigo.local");
    expect(result.markdown).not.toContain("Internal admin");
    expect(result.summary.guardrails.providerLoginEnabled).toBe(false);
  });

  it("returns a persistent internal pilot readiness checklist with system snapshot", async () => {
    prisma.smeServicesPilotReadinessItem.upsert.mockResolvedValue(readinessItem);
    prisma.smeServicesPilotReadinessItem.findMany.mockResolvedValue([readinessItem]);
    mockAdminSummaryQueries();

    const result = await service.adminPilotReadiness();

    expect(prisma.smeServicesPilotReadinessItem.upsert).toHaveBeenCalled();
    expect(result.status).toBe("NOT_READY");
    expect(result.requiredTotal).toBe(1);
    expect(result.requiredCompleted).toBe(0);
    expect(result.items[0]).toMatchObject({
      key: "pilot_scope_confirmed",
      isRequired: true,
      isCompleted: false
    });
    expect(result.systemSnapshot).toMatchObject({
      approvedProviders: 2,
      pendingProviderApplications: 4,
      approvedProvidersReady: true,
      providerQueueReady: false
    });
    expect(result.guardrails.liveDispatchEnabled).toBe(false);
    expect(result.safetyNote).toContain("does not activate live dispatch");
  });

  it("updates internal pilot readiness items without activating live operations", async () => {
    const completedItem = {
      ...readinessItem,
      isCompleted: true,
      note: "Reviewed by operations",
      updatedByAdminId: "admin-user",
      completedAt: now
    };
    prisma.smeServicesPilotReadinessItem.upsert.mockResolvedValue(readinessItem);
    prisma.smeServicesPilotReadinessItem.update.mockResolvedValue(completedItem);
    prisma.smeServicesPilotReadinessItem.findMany.mockResolvedValue([completedItem]);
    mockAdminSummaryQueries();

    const result = await service.adminUpdatePilotReadiness("admin-user", {
      items: [
        { key: "pilot_scope_confirmed", isCompleted: true, note: "Reviewed by operations" },
        { key: "unknown_key", isCompleted: true, note: "Ignored" }
      ]
    });

    expect(prisma.smeServicesPilotReadinessItem.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { key: "pilot_scope_confirmed" },
      data: expect.objectContaining({
        isCompleted: true,
        note: "Reviewed by operations",
        updatedByAdminId: "admin-user"
      })
    }));
    expect(audit.record).toHaveBeenCalledWith("admin-user", "sme_services.pilot_readiness_updated", "SmeServicesPilotReadiness", "pilot-readiness", {
      updatedKeys: ["pilot_scope_confirmed"],
      ignoredKeys: ["unknown_key"],
      completedCount: 1
    });
    expect(result.requiredCompleted).toBe(1);
    expect(result.guardrails.livePaymentsEnabled).toBe(false);
  });

  it("returns SME Services pilot launch control with readiness and decision history", async () => {
    prisma.smeServicesPilotReadinessItem.upsert.mockResolvedValue(readinessItem);
    prisma.smeServicesPilotReadinessItem.findMany.mockResolvedValue([readinessItem]);
    prisma.smeServicesPilotLaunchDecision.findFirst.mockResolvedValue(launchDecision);
    prisma.smeServicesPilotLaunchDecision.findMany.mockResolvedValue([launchDecision]);
    mockAdminSummaryQueries();

    const result = await service.adminPilotLaunchControl();

    expect(result.status).toBe(SmeServicesPilotDecisionStatus.CONDITIONAL_GO);
    expect(result.latestDecision).toMatchObject({
      decisionStatus: SmeServicesPilotDecisionStatus.CONDITIONAL_GO,
      readinessStatusSnapshot: "NOT_READY",
      approvedProvidersSnapshot: 2
    });
    expect(result.history).toHaveLength(1);
    expect(result.readiness.status).toBe("NOT_READY");
    expect(result.guardrails.liveDispatchEnabled).toBe(false);
    expect(result.safetyNote).toContain("does not activate live dispatch");
  });

  it("records SME Services pilot launch decisions with readiness snapshots only", async () => {
    prisma.smeServicesPilotReadinessItem.upsert.mockResolvedValue(readinessItem);
    prisma.smeServicesPilotReadinessItem.findMany.mockResolvedValue([readinessItem]);
    prisma.smeServicesPilotLaunchDecision.create.mockResolvedValue(launchDecision);
    prisma.smeServicesPilotLaunchDecision.findMany.mockResolvedValue([launchDecision]);
    mockAdminSummaryQueries();

    const result = await service.adminRecordPilotLaunchDecision("admin-user", {
      decisionStatus: SmeServicesPilotDecisionStatus.CONDITIONAL_GO,
      decisionTitle: "Proceed with limited internal pilot",
      decisionSummary: "Operations can invite internal testers after final account checks.",
      conditions: "Keep provider matching manual."
    });

    expect(prisma.smeServicesPilotLaunchDecision.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        decisionStatus: SmeServicesPilotDecisionStatus.CONDITIONAL_GO,
        decisionTitle: "Proceed with limited internal pilot",
        readinessStatusSnapshot: "NOT_READY",
        requiredCompletedSnapshot: 0,
        requiredTotalSnapshot: 1,
        approvedProvidersSnapshot: 2,
        pendingProviderApplicationsSnapshot: 4,
        activeRequestsSnapshot: 6,
        recordedByAdminId: "admin-user"
      })
    }));
    expect(audit.record).toHaveBeenCalledWith("admin-user", "sme_services.pilot_launch_decision_recorded", "SmeServicesPilotLaunchDecision", launchDecision.id, {
      decisionStatus: SmeServicesPilotDecisionStatus.CONDITIONAL_GO,
      readinessStatusSnapshot: "NOT_READY",
      requiredCompletedSnapshot: 0,
      requiredTotalSnapshot: 1,
      approvedProvidersSnapshot: 2
    });
    expect(result.latestDecision?.decisionStatus).toBe(SmeServicesPilotDecisionStatus.CONDITIONAL_GO);
    expect(result.guardrails.livePaymentsEnabled).toBe(false);
  });

  it("blocks internal pilot Go decisions until readiness checklist is complete", async () => {
    prisma.smeServicesPilotReadinessItem.upsert.mockResolvedValue(readinessItem);
    prisma.smeServicesPilotReadinessItem.findMany.mockResolvedValue([readinessItem]);
    mockAdminSummaryQueries();

    await expect(service.adminRecordPilotLaunchDecision("admin-user", {
      decisionStatus: SmeServicesPilotDecisionStatus.GO_INTERNAL_PILOT,
      decisionTitle: "Go for internal pilot"
    })).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.smeServicesPilotLaunchDecision.create).not.toHaveBeenCalled();
  });

  it("lists SME Services pilot participants with filters and safe coordination guardrails", async () => {
    prisma.smeServicesPilotParticipant.findMany.mockResolvedValue([pilotParticipant]);
    prisma.smeServicesPilotParticipant.count
      .mockResolvedValueOnce(3)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0);

    const result = await service.adminListPilotParticipants({
      participantType: SmeServicesPilotParticipantType.CUSTOMER,
      status: SmeServicesPilotParticipantStatus.READY_TO_INVITE,
      city: "Kano",
      pilotZone: "Nasarawa",
      search: "Demo"
    });

    expect(prisma.smeServicesPilotParticipant.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        participantType: SmeServicesPilotParticipantType.CUSTOMER,
        status: SmeServicesPilotParticipantStatus.READY_TO_INVITE,
        city: { contains: "Kano", mode: "insensitive" },
        pilotZone: { contains: "Nasarawa", mode: "insensitive" },
        OR: expect.any(Array)
      }),
      take: 200
    }));
    expect(result.summary).toMatchObject({ total: 3, customers: 1, providers: 1, observers: 1 });
    expect(result.items[0]).toMatchObject({ displayName: "Demo Pilot Customer", status: SmeServicesPilotParticipantStatus.READY_TO_INVITE });
    expect(result.guardrails).toMatchObject({
      liveInvitationsSent: false,
      liveDispatchEnabled: false,
      providerLoginEnabled: false,
      providerAppAccessEnabled: false,
      livePaymentsEnabled: false
    });
  });

  it("creates SME Services pilot participants without sending invitations", async () => {
    prisma.smeServicesPilotParticipant.create.mockResolvedValue(pilotParticipant);

    const result = await service.adminCreatePilotParticipant("admin-user", {
      participantType: SmeServicesPilotParticipantType.CUSTOMER,
      status: SmeServicesPilotParticipantStatus.READY_TO_INVITE,
      displayName: "Demo Pilot Customer",
      phoneNumber: "+2348011111111",
      email: "pilot.customer@karigo.local",
      city: "Kano",
      pilotZone: "Nasarawa GRA",
      relatedUserId: "00000000-0000-0000-0000-000000000d01",
      invitationChannel: SmeServicesPilotInvitationChannel.PHONE,
      invitationNote: "Call manually after signoff",
      internalNotes: "Internal pilot participant only",
      consentConfirmed: true
    });

    expect(prisma.smeServicesPilotParticipant.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        participantType: SmeServicesPilotParticipantType.CUSTOMER,
        status: SmeServicesPilotParticipantStatus.READY_TO_INVITE,
        displayName: "Demo Pilot Customer",
        invitedAt: undefined,
        createdByAdminId: "admin-user",
        updatedByAdminId: "admin-user"
      })
    }));
    expect(audit.record).toHaveBeenCalledWith("admin-user", "sme_services.pilot_participant_created", "SmeServicesPilotParticipant", pilotParticipant.id, expect.objectContaining({
      participantType: SmeServicesPilotParticipantType.CUSTOMER,
      status: SmeServicesPilotParticipantStatus.READY_TO_INVITE
    }));
    expect(result.displayName).toBe("Demo Pilot Customer");
  });

  it("updates SME Services pilot participant status manually and records invitation timestamp", async () => {
    prisma.smeServicesPilotParticipant.findUnique.mockResolvedValue(pilotParticipant);
    prisma.smeServicesPilotParticipant.update.mockResolvedValue({
      ...pilotParticipant,
      status: SmeServicesPilotParticipantStatus.INVITED_MANUALLY,
      invitedAt: now,
      safetyBriefingCompleted: true
    });

    const result = await service.adminUpdatePilotParticipant("admin-user", pilotParticipant.id, {
      status: SmeServicesPilotParticipantStatus.INVITED_MANUALLY,
      safetyBriefingCompleted: true
    });

    expect(prisma.smeServicesPilotParticipant.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: pilotParticipant.id },
      data: expect.objectContaining({
        status: SmeServicesPilotParticipantStatus.INVITED_MANUALLY,
        safetyBriefingCompleted: true,
        invitedAt: expect.any(Date),
        updatedByAdminId: "admin-user"
      })
    }));
    expect(audit.record).toHaveBeenCalledWith("admin-user", "sme_services.pilot_participant_updated", "SmeServicesPilotParticipant", pilotParticipant.id, expect.objectContaining({
      previousStatus: SmeServicesPilotParticipantStatus.READY_TO_INVITE,
      status: SmeServicesPilotParticipantStatus.INVITED_MANUALLY
    }));
    expect(result.status).toBe(SmeServicesPilotParticipantStatus.INVITED_MANUALLY);
    expect(result.safetyBriefingCompleted).toBe(true);
  });

  it("blocks readiness-only service providers from pilot invitation statuses", async () => {
    prisma.serviceProvider.findUnique.mockResolvedValue({
      ...provider,
      serviceType: ServiceProviderType.HEALTH_PROFESSIONAL,
      readinessOnly: true
    });

    await expect(service.adminCreatePilotParticipant("admin-user", {
      participantType: SmeServicesPilotParticipantType.SERVICE_PROVIDER,
      status: SmeServicesPilotParticipantStatus.READY_TO_INVITE,
      displayName: "Readiness Doctor",
      relatedProviderId: provider.id
    })).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.smeServicesPilotParticipant.create).not.toHaveBeenCalled();
  });

  it("returns admin detail with review history", async () => {
    prisma.serviceProviderRequest.findUnique.mockResolvedValue(request);
    prisma.adminAuditLog.findMany.mockResolvedValue([{ id: "audit-1", action: "service_provider_request.status_changed", createdAt: now }]);

    const result = await service.adminDetail(request.id);

    expect(prisma.adminAuditLog.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { entityType: "ServiceProviderRequest", entityId: request.id },
      take: 20
    }));
    expect(result.reviewHistory).toHaveLength(1);
  });

  it("updates admin status and stores separate internal and customer-visible notes", async () => {
    prisma.serviceProviderRequest.findUnique.mockResolvedValue(request);
    prisma.serviceProviderRequest.update.mockResolvedValue({
      ...request,
      status: ServiceProviderRequestStatus.UNDER_REVIEW,
      adminNote: "Call customer",
      customerUpdateNote: "KariGO is reviewing your request."
    });

    const result = await service.adminUpdateStatus("admin-user", request.id, {
      status: ServiceProviderRequestStatus.UNDER_REVIEW,
      adminNote: "Call customer",
      customerNote: "KariGO is reviewing your request."
    });

    expect(prisma.serviceProviderRequest.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: request.id },
      data: {
        status: ServiceProviderRequestStatus.UNDER_REVIEW,
        adminNote: "Call customer",
        customerUpdateNote: "KariGO is reviewing your request."
      }
    }));
    expect(audit.record).toHaveBeenCalledWith("admin-user", "service_provider_request.status_changed", "ServiceProviderRequest", request.id, {
      previousStatus: ServiceProviderRequestStatus.SUBMITTED,
      status: ServiceProviderRequestStatus.UNDER_REVIEW,
      serviceType: ServiceProviderType.PLUMBER,
      requestNumber: "KGO-SVC-001",
      customerUpdateNoteProvided: true
    });
    expect(result.status).toBe(ServiceProviderRequestStatus.UNDER_REVIEW);
    expect(result.adminNote).toBe("Call customer");
    expect(result.customerUpdateNote).toBe("KariGO is reviewing your request.");
  });

  it("returns customer-visible update notes without internal admin notes or provider contact fields", async () => {
    prisma.customerProfile.findUnique.mockResolvedValue({ id: "customer-1" });
    prisma.serviceProviderRequest.findFirst.mockResolvedValue({
      ...request,
      adminNote: "Internal admin follow-up",
      customerUpdateNote: "KariGO is matching a suitable provider."
    });

    const result = await service.detail("user-1", request.id);

    expect(prisma.serviceProviderRequest.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: request.id, customerId: "customer-1" }
    }));
    expect(result.customerUpdateNote).toBe("KariGO is matching a suitable provider.");
    expect(result).not.toHaveProperty("adminNote");
    expect(result).not.toHaveProperty("assignedProvider");
    expect(result).not.toHaveProperty("assignmentNote");
  });

  it("does not return another customer's SME Services request notes", async () => {
    prisma.customerProfile.findUnique.mockResolvedValue({ id: "customer-2" });
    prisma.serviceProviderRequest.findFirst.mockResolvedValue(null);

    await expect(service.detail("other-user", request.id)).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.serviceProviderRequest.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: request.id, customerId: "customer-2" }
    }));
  });

  it("lists SME Services providers with safe filters and summary counts", async () => {
    prisma.serviceProvider.findMany.mockResolvedValue([provider]);
    prisma.serviceProvider.count
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0);

    const result = await service.adminListProviders({
      status: ServiceProviderStatus.APPROVED,
      serviceType: ServiceProviderType.PLUMBER,
      city: "Kano",
      search: "Demo"
    });

    expect(prisma.serviceProvider.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        status: ServiceProviderStatus.APPROVED,
        serviceType: ServiceProviderType.PLUMBER,
        city: { contains: "Kano", mode: "insensitive" },
        OR: expect.any(Array)
      }),
      take: 200
    }));
    expect(result.summary).toMatchObject({ total: 1, approved: 1 });
    expect(result.items[0]).toMatchObject({ providerCode: "KGO-SP-001", fullName: "Demo Plumber" });
  });

  it("creates provider records without provider login, payout or dispatch records", async () => {
    prisma.serviceProvider.findUnique.mockResolvedValue(null);
    prisma.serviceProvider.create.mockResolvedValue(provider);

    const result = await service.adminCreateProvider("admin-user", {
      fullName: "Demo Plumber",
      businessName: "Demo Plumbing",
      serviceType: ServiceProviderType.PLUMBER,
      phoneNumber: "+2348022222222",
      email: "provider@karigo.local",
      city: "Kano",
      state: "Kano",
      serviceAreas: ["Nasarawa GRA"],
      status: ServiceProviderStatus.APPROVED,
      verificationNote: "ID checked"
    });

    expect(prisma.serviceProvider.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        fullName: "Demo Plumber",
        serviceType: ServiceProviderType.PLUMBER,
        status: ServiceProviderStatus.APPROVED
      })
    }));
    expect(audit.record).toHaveBeenCalledWith("admin-user", "service_provider.created", "ServiceProvider", provider.id, expect.objectContaining({
      providerCode: provider.providerCode
    }));
    expect(result.providerCode).toBe("KGO-SP-001");
  });

  it("blocks approved health professional provider records", async () => {
    await expect(service.adminCreateProvider("admin-user", {
      fullName: "Demo Doctor",
      serviceType: ServiceProviderType.HEALTH_PROFESSIONAL,
      phoneNumber: "+2348033333333",
      city: "Kano",
      state: "Kano",
      status: ServiceProviderStatus.APPROVED
    })).rejects.toBeInstanceOf(BadRequestException);
  });

  it("creates readiness-only provider records for review without approving them", async () => {
    const readinessProvider = {
      ...provider,
      serviceType: ServiceProviderType.HEALTH_PROFESSIONAL,
      status: ServiceProviderStatus.PENDING_REVIEW,
      readinessOnly: true
    };
    prisma.serviceProvider.findUnique.mockResolvedValue(null);
    prisma.serviceProvider.create.mockResolvedValue(readinessProvider);

    const result = await service.adminCreateProvider("admin-user", {
      fullName: "Demo Doctor",
      serviceType: ServiceProviderType.HEALTH_PROFESSIONAL,
      phoneNumber: "+2348033333333",
      city: "Kano",
      state: "Kano",
      readinessOnly: false,
      status: ServiceProviderStatus.PENDING_REVIEW
    });

    expect(prisma.serviceProvider.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        serviceType: ServiceProviderType.HEALTH_PROFESSIONAL,
        status: ServiceProviderStatus.PENDING_REVIEW,
        readinessOnly: true
      })
    }));
    expect(result.readinessOnly).toBe(true);
    expect(result.status).toBe(ServiceProviderStatus.PENDING_REVIEW);
  });

  it("manually assigns only an approved matching provider and records review status", async () => {
    prisma.serviceProviderRequest.findUnique.mockResolvedValue(request);
    prisma.serviceProvider.findUnique.mockResolvedValue(provider);
    prisma.serviceProviderRequest.update.mockResolvedValue({
      ...request,
      status: ServiceProviderRequestStatus.PROVIDER_ASSIGNED,
      assignedProviderId: provider.id,
      assignedByAdminId: "admin-user",
      assignmentNote: "Manual call confirmed",
      assignedAt: now,
      assignedProvider: provider,
      assignedByAdmin: { id: "admin-user", fullName: "Ops Admin", email: "admin@karigo.local" }
    });

    const result = await service.adminAssignProvider("admin-user", request.id, {
      providerId: provider.id,
      assignmentNote: "Manual call confirmed"
    });

    expect(prisma.serviceProviderRequest.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: request.id },
      data: expect.objectContaining({
        assignedProviderId: provider.id,
        assignedByAdminId: "admin-user",
        assignmentNote: "Manual call confirmed",
        status: ServiceProviderRequestStatus.PROVIDER_ASSIGNED
      })
    }));
    expect(audit.record).toHaveBeenCalledWith("admin-user", "service_provider_request.provider_assigned", "ServiceProviderRequest", request.id, expect.objectContaining({
      providerCode: provider.providerCode,
      status: ServiceProviderRequestStatus.PROVIDER_ASSIGNED
    }));
    expect(result.assignedProvider?.providerCode).toBe("KGO-SP-001");
    expect(result.status).toBe(ServiceProviderRequestStatus.PROVIDER_ASSIGNED);
  });

  it("rejects manual assignment for mismatched provider service type", async () => {
    prisma.serviceProviderRequest.findUnique.mockResolvedValue(request);
    prisma.serviceProvider.findUnique.mockResolvedValue({ ...provider, serviceType: ServiceProviderType.ELECTRICIAN });

    await expect(service.adminAssignProvider("admin-user", request.id, {
      providerId: provider.id
    })).rejects.toBeInstanceOf(BadRequestException);
  });

  it("rejects admin detail for missing requests", async () => {
    prisma.serviceProviderRequest.findUnique.mockResolvedValue(null);
    await expect(service.adminDetail(request.id)).rejects.toBeInstanceOf(NotFoundException);
  });
});
