import { BadRequestException } from "@nestjs/common";
import { AccountStatus, PreferredContactMethod, UserRole, VendorApplicationCategory, VendorApplicationStatus } from "@prisma/client";
import { ApplicationNotificationsService } from "../../common/services/application-notifications.service";
import { PrismaService } from "../../prisma/prisma.service";
import { VendorApplicationsService } from "./vendor-applications.service";

const now = new Date("2026-07-13T10:00:00.000Z");

const vendorApplication = {
  id: "00000000-0000-0000-0000-00000000a115",
  reference: "KGO-APP-2026-ABC123",
  businessCategory: VendorApplicationCategory.RESTAURANT,
  businessName: "Kano Kitchen",
  tradingName: null,
  businessType: "restaurant",
  businessDescription: "Food vendor",
  businessAddress: "Tarauni, Kano",
  state: "Kano",
  city: "Kano",
  area: null,
  serviceAreas: null,
  operatingHours: null,
  businessPhoneNumber: "+2348030000000",
  businessEmail: "vendor@example.test",
  websiteOrSocialLink: null,
  contactFullName: "Demo Owner",
  contactRole: "Owner/Manager",
  contactPhoneNumber: "+2348030000000",
  contactEmail: "vendor@example.test",
  preferredContactMethod: PreferredContactMethod.PHONE,
  deliveryReadiness: "Submitted from public KariGO website",
  deliveryPreference: "KariGO review required",
  averagePreparationTime: null,
  numberOfStaff: null,
  catalogueCategory: "RESTAURANT",
  estimatedCatalogueSize: null,
  existingDelivery: null,
  brandAssets: null,
  documentPlaceholders: null,
  declarationAccepted: true,
  privacyAccepted: true,
  contactConsentAccepted: true,
  status: VendorApplicationStatus.SUBMITTED,
  submittedAt: now,
  reviewedAt: null,
  deletedAt: null,
  trashReason: null,
  trashNote: null,
  trashedByAdminId: null,
  restoredAt: null,
  restoredByAdminId: null,
  applicantUserId: "00000000-0000-0000-0000-00000000vusr",
  applicant: {
    id: "00000000-0000-0000-0000-00000000vusr",
    fullName: "Demo Owner",
    phoneNumber: "+2348030000000",
    email: "vendor@example.test",
    role: UserRole.VENDOR,
    accountStatus: AccountStatus.PENDING,
    phoneVerified: true,
    onboardingPasswordSetAt: now,
    deletedAt: null
  },
  vendorId: null,
  createdAt: now,
  updatedAt: now,
  reviews: [],
  statusHistory: [],
  documents: [],
  vendor: null
};

describe("VendorApplicationsService", () => {
  const prisma: any = {
    $transaction: jest.fn(),
    user: {
      findUnique: jest.fn()
    },
    vendorApplication: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn()
    },
    partnerOnboardingDraft: {
      upsert: jest.fn(),
      update: jest.fn()
    },
    order: { count: jest.fn() },
    vendorSettlement: { count: jest.fn() },
    vendorPayoutAccount: { count: jest.fn() },
    orderItem: { count: jest.fn() },
    payment: { count: jest.fn() },
    vendorApplicationDocument: { count: jest.fn() },
    vendorApplicationReview: { count: jest.fn() },
    vendorApplicationStatusHistory: { count: jest.fn() }
  };
  const applicationNotifications = {
    vendorApplicationSubmitted: jest.fn(),
    vendorApplicationReviewed: jest.fn()
  };
  const service = new VendorApplicationsService(prisma as unknown as PrismaService, applicationNotifications as unknown as ApplicationNotificationsService);

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.user.findUnique.mockResolvedValue(vendorApplication.applicant);
    prisma.vendorApplication.findUnique.mockResolvedValue(null);
    prisma.vendorApplication.findFirst.mockResolvedValue(null);
    prisma.vendorApplication.findMany.mockResolvedValue([]);
    prisma.vendorApplication.create.mockResolvedValue(vendorApplication);
    prisma.partnerOnboardingDraft.upsert.mockResolvedValue({
      id: "00000000-0000-0000-0000-00000000pod1",
      userId: "customer-user-1",
      applicationId: null,
      onboardingStage: "START",
      accountType: null,
      draftData: null,
      submittedAt: null,
      createdAt: now,
      updatedAt: now
    });
    prisma.partnerOnboardingDraft.update.mockResolvedValue({
      id: "00000000-0000-0000-0000-00000000pod1",
      userId: "customer-user-1",
      applicationId: vendorApplication.id,
      onboardingStage: "SUBMITTED",
      accountType: null,
      draftData: null,
      submittedAt: now,
      createdAt: now,
      updatedAt: now
    });
    prisma.order.count.mockResolvedValue(0);
    prisma.vendorSettlement.count.mockResolvedValue(0);
    prisma.vendorPayoutAccount.count.mockResolvedValue(0);
    prisma.orderItem.count.mockResolvedValue(0);
    prisma.payment.count.mockResolvedValue(0);
    prisma.vendorApplicationDocument.count.mockResolvedValue(0);
    prisma.vendorApplicationReview.count.mockResolvedValue(0);
    prisma.vendorApplicationStatusHistory.count.mockResolvedValue(0);
    applicationNotifications.vendorApplicationSubmitted.mockResolvedValue(undefined);
    applicationNotifications.vendorApplicationReviewed.mockResolvedValue(undefined);
  });

  const baseDto = {
    businessCategory: VendorApplicationCategory.RESTAURANT,
    businessName: "Kano Kitchen",
    businessType: "restaurant",
    businessDescription: "Food vendor",
    businessAddress: "Tarauni, Kano",
    state: "Kano",
    city: "Kano",
    businessPhoneNumber: "+2348030000000",
    businessEmail: "vendor@example.test",
    contactFullName: "Demo Owner",
    contactRole: "Owner/Manager",
    contactPhoneNumber: "+2348030000000",
    contactEmail: "vendor@example.test",
    preferredContactMethod: PreferredContactMethod.PHONE,
    declarationAccepted: true,
    privacyAccepted: true,
    contactConsentAccepted: true
  };

  it("accepts Kano and Abuja public vendor applications", async () => {
    const result = await service.create(baseDto);

    expect(prisma.vendorApplication.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ city: "Kano", state: "Kano" })
    }));
    expect(applicationNotifications.vendorApplicationSubmitted).toHaveBeenCalledWith(expect.objectContaining({
      reference: vendorApplication.reference,
      phoneNumber: vendorApplication.contactPhoneNumber,
      email: vendorApplication.contactEmail
    }));
    expect(result).toMatchObject({ status: VendorApplicationStatus.SUBMITTED });

    prisma.vendorApplication.create.mockResolvedValueOnce({
      ...vendorApplication,
      city: "Abuja",
      state: "FCT"
    });

    await expect(service.create({ ...baseDto, city: "Abuja", state: "FCT" }))
      .resolves.toMatchObject({ status: VendorApplicationStatus.SUBMITTED });
  });

  it("normalizes vendor application phone numbers before persistence and notification", async () => {
    prisma.vendorApplication.create.mockResolvedValueOnce({
      ...vendorApplication,
      businessPhoneNumber: "+2348030000000",
      contactPhoneNumber: "+2348051112222"
    });

    const result = await service.create({
      ...baseDto,
      businessPhoneNumber: "0803 000 0000",
      contactPhoneNumber: "0805-111-2222"
    });

    expect(prisma.vendorApplication.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        businessPhoneNumber: "+2348030000000",
        contactPhoneNumber: "+2348051112222"
      })
    }));
    expect(applicationNotifications.vendorApplicationSubmitted).toHaveBeenCalledWith(expect.objectContaining({
      phoneNumber: "+2348051112222"
    }));
    expect(result).toMatchObject({ status: VendorApplicationStatus.SUBMITTED });
  });

  it("allows an active verified Customer account to submit Partner onboarding without creating a duplicate user", async () => {
    prisma.user.findUnique.mockResolvedValueOnce({
      id: "customer-user-1",
      role: UserRole.CUSTOMER,
      accountStatus: AccountStatus.ACTIVE,
      phoneVerified: true,
      onboardingPasswordSetAt: null,
      deletedAt: null
    });

    await service.create(baseDto);

    expect(prisma.vendorApplication.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        applicant: { connect: { id: "customer-user-1" } },
        contactPhoneNumber: "+2348030000000"
      })
    }));
  });

  it("returns a recognised Partner onboarding state for an existing Customer account without an application", async () => {
    prisma.user.findUnique.mockResolvedValueOnce({
      id: "customer-user-1",
      fullName: "Existing Customer",
      phoneNumber: "+2348030000000",
      email: "customer@example.test",
      role: UserRole.CUSTOMER,
      accountStatus: AccountStatus.ACTIVE,
      phoneVerified: true,
      deletedAt: null,
      vendor: null
    });
    prisma.vendorApplication.findFirst.mockResolvedValueOnce(null);

    await expect(service.currentUserPartnerStatus("customer-user-1")).resolves.toMatchObject({
      authenticated: true,
      state: "application_not_started",
      account: {
        id: "customer-user-1",
        role: UserRole.CUSTOMER,
        phoneVerified: true
      },
      message: "Your KariGO account has been recognised. Continue to create your Partner profile."
    });
  });

  it("returns submitted Partner application status for a central Customer account", async () => {
    prisma.user.findUnique.mockResolvedValueOnce({
      id: "customer-user-1",
      fullName: "Existing Customer",
      phoneNumber: "+2348030000000",
      email: "customer@example.test",
      role: UserRole.CUSTOMER,
      accountStatus: AccountStatus.ACTIVE,
      phoneVerified: true,
      deletedAt: null,
      vendor: null
    });
    prisma.vendorApplication.findFirst.mockResolvedValueOnce({
      ...vendorApplication,
      applicantUserId: "customer-user-1",
      applicant: {
        ...vendorApplication.applicant,
        id: "customer-user-1",
        role: UserRole.CUSTOMER,
        accountStatus: AccountStatus.ACTIVE
      }
    });

    await expect(service.currentUserPartnerStatus("customer-user-1")).resolves.toMatchObject({
      authenticated: true,
      state: "application_submitted",
      application: {
        reference: vendorApplication.reference,
        status: VendorApplicationStatus.SUBMITTED
      }
    });
  });

  it("ensures a Partner onboarding draft for an existing Customer account without duplicating the user", async () => {
    prisma.user.findUnique.mockResolvedValueOnce({
      id: "customer-user-1",
      fullName: "Existing Customer",
      phoneNumber: "+2348030000000",
      email: "customer@example.test",
      role: UserRole.CUSTOMER,
      accountStatus: AccountStatus.ACTIVE,
      phoneVerified: true,
      deletedAt: null,
      vendor: null
    });
    prisma.vendorApplication.findFirst.mockResolvedValueOnce(null);

    const result = await service.ensurePartnerApplicant("customer-user-1");

    expect(prisma.partnerOnboardingDraft.upsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { userId: "customer-user-1" },
      create: expect.objectContaining({ userId: "customer-user-1", onboardingStage: "START" })
    }));
    expect(result).toMatchObject({
      partnerApplicantId: "customer-user-1",
      onboardingStage: "START",
      canSubmit: true,
      nextRoute: "/register"
    });
  });

  it("ensures a Partner onboarding draft for an existing Captain account without duplicating the user", async () => {
    prisma.user.findUnique.mockResolvedValueOnce({
      id: "captain-user-1",
      fullName: "Existing Captain",
      phoneNumber: "+2348030000000",
      email: "captain@example.test",
      role: UserRole.RIDER,
      accountStatus: AccountStatus.ACTIVE,
      phoneVerified: true,
      deletedAt: null,
      vendor: null
    });
    prisma.vendorApplication.findFirst.mockResolvedValueOnce(null);
    prisma.partnerOnboardingDraft.upsert.mockResolvedValueOnce({
      id: "00000000-0000-0000-0000-00000000pod2",
      userId: "captain-user-1",
      applicationId: null,
      onboardingStage: "START",
      accountType: null,
      draftData: null,
      submittedAt: null,
      createdAt: now,
      updatedAt: now
    });

    const result = await service.ensurePartnerApplicant("captain-user-1");

    expect(result).toMatchObject({
      partnerApplicantId: "captain-user-1",
      account: { role: UserRole.RIDER },
      nextRoute: "/register"
    });
  });

  it("submits an authenticated Partner application by resolving the applicant from the signed-in user", async () => {
    prisma.user.findUnique.mockResolvedValueOnce({
      id: "customer-user-1",
      fullName: "Existing Customer",
      phoneNumber: "+2348030000000",
      email: "customer@example.test",
      role: UserRole.CUSTOMER,
      accountStatus: AccountStatus.ACTIVE,
      phoneVerified: true,
      deletedAt: null,
      vendor: null
    });
    const tx = {
      partnerOnboardingDraft: {
        upsert: jest.fn().mockResolvedValue({
          id: "00000000-0000-0000-0000-00000000pod1",
          userId: "customer-user-1",
          applicationId: null,
          onboardingStage: "REVIEW",
          accountType: null,
          draftData: null,
          submittedAt: null,
          createdAt: now,
          updatedAt: now
        }),
        update: jest.fn()
      },
      vendorApplication: {
        findUnique: jest.fn(),
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({
          ...vendorApplication,
          applicantUserId: "customer-user-1",
          applicant: {
            ...vendorApplication.applicant,
            id: "customer-user-1",
            role: UserRole.CUSTOMER,
            accountStatus: AccountStatus.ACTIVE
          }
        })
      }
    };
    prisma.$transaction.mockImplementationOnce(async (callback: any) => callback(tx));

    const result = await service.submitForCurrentUser("customer-user-1", baseDto);

    expect(tx.vendorApplication.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        applicant: { connect: { id: "customer-user-1" } },
        status: VendorApplicationStatus.SUBMITTED
      })
    }));
    expect(tx.partnerOnboardingDraft.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { userId: "customer-user-1" },
      data: expect.objectContaining({ onboardingStage: "SUBMITTED" })
    }));
    expect(result).toMatchObject({ alreadySubmitted: false, status: VendorApplicationStatus.SUBMITTED });
  });

  it("returns the existing application for duplicate authenticated submission retries", async () => {
    prisma.user.findUnique.mockResolvedValueOnce({
      id: "customer-user-1",
      fullName: "Existing Customer",
      phoneNumber: "+2348030000000",
      email: "customer@example.test",
      role: UserRole.CUSTOMER,
      accountStatus: AccountStatus.ACTIVE,
      phoneVerified: true,
      deletedAt: null,
      vendor: null
    });
    const tx = {
      partnerOnboardingDraft: {
        upsert: jest.fn().mockResolvedValue({
          id: "00000000-0000-0000-0000-00000000pod1",
          userId: "customer-user-1",
          applicationId: vendorApplication.id,
          onboardingStage: "SUBMITTED",
          accountType: null,
          draftData: null,
          submittedAt: now,
          createdAt: now,
          updatedAt: now
        }),
        update: jest.fn()
      },
      vendorApplication: {
        findUnique: jest.fn().mockResolvedValue({
          ...vendorApplication,
          applicantUserId: "customer-user-1"
        }),
        findFirst: jest.fn(),
        create: jest.fn()
      }
    };
    prisma.$transaction.mockImplementationOnce(async (callback: any) => callback(tx));

    const result = await service.submitForCurrentUser("customer-user-1", baseDto);

    expect(tx.vendorApplication.create).not.toHaveBeenCalled();
    expect(applicationNotifications.vendorApplicationSubmitted).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      alreadySubmitted: true,
      message: "Your Partner application has already been submitted."
    });
  });

  it("rejects invalid vendor application phone numbers before persistence", async () => {
    await expect(service.create({
      ...baseDto,
      contactPhoneNumber: "12345"
    })).rejects.toBeInstanceOf(BadRequestException);

    expect(prisma.vendorApplication.create).not.toHaveBeenCalled();
    expect(applicationNotifications.vendorApplicationSubmitted).not.toHaveBeenCalled();
  });

  it("rejects public vendor applications outside approved launch city pairs", async () => {
    await expect(service.create({ ...baseDto, city: "Kaduna", state: "Kaduna" })).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.create({ ...baseDto, city: "Abuja", state: "Kano" })).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.vendorApplication.create).not.toHaveBeenCalled();
  });

  it("notifies applicants when Admin reviews a vendor application without exposing internal notes", async () => {
    const reviewedApplication = {
      ...vendorApplication,
      status: VendorApplicationStatus.APPROVED,
      reviewedAt: now
    };
    const tx = {
      vendorApplicationReview: { create: jest.fn() },
      vendorApplicationStatusHistory: { create: jest.fn() },
      vendorApplication: { update: jest.fn().mockResolvedValue(reviewedApplication) },
      user: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({
          id: "00000000-0000-0000-0000-00000000vusr",
          role: "VENDOR",
          accountStatus: "PENDING",
          email: vendorApplication.contactEmail,
          phoneNumber: vendorApplication.contactPhoneNumber,
          vendor: null
        })
      },
      vendor: { create: jest.fn().mockResolvedValue({ id: "00000000-0000-0000-0000-00000000v001", userId: "00000000-0000-0000-0000-00000000vusr" }) },
      vendorAccountActivation: { updateMany: jest.fn(), create: jest.fn() },
      vendorAuditLog: { create: jest.fn() },
      adminAuditLog: { create: jest.fn() }
    };
    prisma.vendorApplication.findUnique.mockResolvedValueOnce({
      ...vendorApplication,
      id: vendorApplication.id,
      applicantUserId: null,
      applicant: null,
      status: VendorApplicationStatus.SUBMITTED
    });
    prisma.$transaction.mockImplementationOnce(async (callback: any) => callback(tx));

    await expect(service.review(vendorApplication.id, "00000000-0000-0000-0000-00000000a001", {
      status: VendorApplicationStatus.APPROVED,
      notes: "Internal setup note"
    })).resolves.toMatchObject({ status: VendorApplicationStatus.APPROVED });

    expect(applicationNotifications.vendorApplicationReviewed).toHaveBeenCalledWith({
      reference: vendorApplication.reference,
      recipientName: vendorApplication.contactFullName,
      phoneNumber: vendorApplication.contactPhoneNumber,
      email: vendorApplication.contactEmail,
      status: VendorApplicationStatus.APPROVED,
      activationUrl: expect.stringContaining("/activate?token="),
      activationExpiresAt: expect.any(String)
    });
    expect(tx.vendor.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        businessName: vendorApplication.businessName,
        status: "PENDING_APPROVAL",
        isOpen: false
      })
    }));
    expect(tx.vendorAccountActivation.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        vendorId: "00000000-0000-0000-0000-00000000v001",
        userId: "00000000-0000-0000-0000-00000000vusr"
      })
    }));
    expect(tx.adminAuditLog.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        adminUserId: "00000000-0000-0000-0000-00000000a001",
        action: "admin.vendor_application.reviewed",
        entityType: "VendorApplication",
        entityId: vendorApplication.id,
        newValue: expect.objectContaining({
          previousStatus: VendorApplicationStatus.SUBMITTED,
          newStatus: VendorApplicationStatus.APPROVED,
          hasReason: true
        })
      })
    }));
  });

  it("requires a reason when rejecting a vendor application", async () => {
    prisma.vendorApplication.findUnique.mockResolvedValueOnce({
      ...vendorApplication,
      status: VendorApplicationStatus.SUBMITTED
    });

    await expect(service.review(vendorApplication.id, "00000000-0000-0000-0000-00000000a001", {
      status: VendorApplicationStatus.REJECTED
    })).rejects.toBeInstanceOf(BadRequestException);

    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(applicationNotifications.vendorApplicationReviewed).not.toHaveBeenCalled();
  });

  it("rejects duplicate vendor application review transitions", async () => {
    prisma.vendorApplication.findUnique.mockResolvedValueOnce({
      ...vendorApplication,
      status: VendorApplicationStatus.SUBMITTED
    });

    await expect(service.review(vendorApplication.id, "00000000-0000-0000-0000-00000000a001", {
      status: VendorApplicationStatus.SUBMITTED,
      notes: "No status change"
    })).rejects.toBeInstanceOf(BadRequestException);

    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("excludes trashed vendor applications from the default admin list", async () => {
    await service.list();

    expect(prisma.vendorApplication.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { deletedAt: null }
    }));

    await service.list(undefined, "trashed");

    expect(prisma.vendorApplication.findMany).toHaveBeenLastCalledWith(expect.objectContaining({
      where: { deletedAt: { not: null } }
    }));
  });

  it("moves a vendor application to Trash with an admin reason", async () => {
    const trashedAt = new Date("2026-07-26T10:00:00.000Z");
    const tx = {
      vendorApplication: {
        update: jest.fn().mockResolvedValue({
          ...vendorApplication,
          deletedAt: trashedAt,
          trashReason: "duplicate",
          trashNote: "Duplicate live-test application"
        })
      },
      adminAuditLog: { create: jest.fn() }
    };
    prisma.vendorApplication.findUnique.mockResolvedValueOnce(vendorApplication);
    prisma.$transaction.mockImplementationOnce(async (callback: any) => callback(tx));

    const result = await service.trash(vendorApplication.id, "00000000-0000-0000-0000-00000000a001", "duplicate", "Duplicate live-test application");

    expect(tx.vendorApplication.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: vendorApplication.id },
      data: expect.objectContaining({
        trashReason: "duplicate",
        trashNote: "Duplicate live-test application",
        trashedByAdminId: "00000000-0000-0000-0000-00000000a001"
      })
    }));
    expect(tx.adminAuditLog.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ action: "admin.vendor_application.trash" })
    }));
    expect(result).toMatchObject({ inTrash: true, trashReason: "duplicate" });
  });

  it("restores a trashed vendor application", async () => {
    const trashedApplication = { ...vendorApplication, deletedAt: now, trashReason: "test account" };
    const tx = {
      vendorApplication: {
        update: jest.fn().mockResolvedValue({ ...vendorApplication, restoredAt: now, restoredByAdminId: "00000000-0000-0000-0000-00000000a001" })
      },
      adminAuditLog: { create: jest.fn() }
    };
    prisma.vendorApplication.findUnique.mockResolvedValueOnce(trashedApplication);
    prisma.$transaction.mockImplementationOnce(async (callback: any) => callback(tx));

    const result = await service.restore(vendorApplication.id, "00000000-0000-0000-0000-00000000a001", "record needed");

    expect(tx.vendorApplication.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ deletedAt: null, restoredByAdminId: "00000000-0000-0000-0000-00000000a001" })
    }));
    expect(tx.adminAuditLog.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ action: "admin.vendor_application.restore" })
    }));
    expect(result).toMatchObject({ inTrash: false });
  });

  it("permanently deletes only a safe trashed vendor application", async () => {
    const safeTrashedApplication = { ...vendorApplication, deletedAt: now };
    const tx = {
      vendorApplicationDocument: { deleteMany: jest.fn() },
      vendorApplicationReview: { deleteMany: jest.fn() },
      vendorApplicationStatusHistory: { deleteMany: jest.fn() },
      vendorApplication: { delete: jest.fn() },
      adminAuditLog: { create: jest.fn() }
    };
    prisma.vendorApplication.findUnique.mockResolvedValueOnce(safeTrashedApplication);
    prisma.$transaction.mockImplementationOnce(async (callback: any) => callback(tx));

    await expect(service.permanentlyDelete(vendorApplication.id, "00000000-0000-0000-0000-00000000a001", "DELETE"))
      .resolves.toEqual({ applicationId: vendorApplication.id, permanentlyDeleted: true });

    expect(tx.vendorApplication.delete).toHaveBeenCalledWith({ where: { id: vendorApplication.id } });
    expect(tx.adminAuditLog.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ action: "admin.vendor_application.permanent_delete" })
    }));
  });

  it("blocks permanent vendor application delete when protected history exists", async () => {
    prisma.vendorApplication.findUnique.mockResolvedValueOnce({
      ...vendorApplication,
      deletedAt: now,
      vendorId: "00000000-0000-0000-0000-00000000v001",
      vendor: {
        id: "00000000-0000-0000-0000-00000000v001",
        businessName: "Samira's Resto Limited",
        status: "ACTIVE",
        deletedAt: null,
        user: { id: "00000000-0000-0000-0000-00000000vusr", accountStatus: "ACTIVE", email: "samira@example.test", phoneNumber: "+2348030000000" },
        activationInvitations: []
      }
    });
    prisma.order.count.mockResolvedValueOnce(1);

    await expect(service.permanentlyDelete(vendorApplication.id, "00000000-0000-0000-0000-00000000a001", "DELETE"))
      .rejects.toBeInstanceOf(BadRequestException);
  });

  it("blocks permanent vendor application delete before Trash", async () => {
    prisma.vendorApplication.findUnique.mockResolvedValueOnce(vendorApplication);

    await expect(service.permanentlyDelete(vendorApplication.id, "00000000-0000-0000-0000-00000000a001", "DELETE"))
      .rejects.toBeInstanceOf(BadRequestException);
  });
});
