import {
  AccountStatus,
  AdminRole,
  OrderStatus,
  PaymentStatus,
  PromoDiscountType,
  PrismaClient,
  RiderStatus,
  ServiceCategory,
  UserRole,
  VendorStatus
} from "@prisma/client";
import { hash } from "bcrypt";

const prisma = new PrismaClient();

async function upsertProduct(vendorId: string, name: string, data: {
  description: string;
  category: string;
  price: number;
  preparationTimeMinutes: number;
}) {
  const existing = await prisma.product.findFirst({ where: { vendorId, name } });
  if (existing) {
    return prisma.product.update({ where: { id: existing.id }, data: { ...data, isActive: true, isAvailable: true } });
  }
  return prisma.product.create({ data: { vendorId, name, ...data } });
}

async function main() {
  const seedPassword = process.env.SEED_DEMO_PASSWORD ?? "ChangeMe123!";
  const passwordHash = await hash(seedPassword, 10);
  const superAdminPasswordHash = await hash(process.env.SUPER_ADMIN_PASSWORD ?? seedPassword, 10);
  const superAdminPhone = process.env.SUPER_ADMIN_PHONE ?? "+2348000000000";
  const superAdminEmail = process.env.SUPER_ADMIN_EMAIL ?? "admin@karigo.local";
  const superAdminName = process.env.SUPER_ADMIN_NAME ?? "KariGO Super Admin";
  const adminUser = await prisma.user.upsert({
    where: { phoneNumber: superAdminPhone },
    update: {
      fullName: superAdminName,
      email: superAdminEmail,
      passwordHash: superAdminPasswordHash,
      accountStatus: AccountStatus.ACTIVE,
      adminRole: AdminRole.SUPER_ADMIN,
      phoneVerified: true
    },
    create: {
      fullName: superAdminName,
      phoneNumber: superAdminPhone,
      email: superAdminEmail,
      passwordHash: superAdminPasswordHash,
      role: UserRole.ADMIN,
      adminRole: AdminRole.SUPER_ADMIN,
      accountStatus: AccountStatus.ACTIVE,
      phoneVerified: true
    }
  });
  await prisma.user.upsert({
    where: { phoneNumber: "+2348000000001" },
    update: {
      passwordHash,
      accountStatus: AccountStatus.ACTIVE,
      adminRole: AdminRole.OPERATIONS_ADMIN,
      phoneVerified: true
    },
    create: {
      fullName: "KariGO Demo Operations Admin",
      phoneNumber: "+2348000000001",
      email: "operations@karigo.local",
      passwordHash,
      role: UserRole.ADMIN,
      adminRole: AdminRole.OPERATIONS_ADMIN,
      accountStatus: AccountStatus.ACTIVE,
      phoneVerified: true
    }
  });
  await prisma.promoCode.upsert({
    where: { code: "KARIGOFIRST" },
    update: {
      title: "KariGO First Order Launch Discount",
      description: "Launch discount for first-time KariGO customers.",
      discountType: PromoDiscountType.PERCENTAGE,
      discountValue: 10,
      maxDiscountAmount: 1000,
      minimumOrderAmount: 2000,
      usageLimitPerCustomer: 1,
      firstOrderOnly: true,
      startsAt: new Date("2025-01-01T00:00:00.000Z"),
      endsAt: new Date("2030-12-31T23:59:59.999Z"),
      isActive: true,
      createdByAdminId: adminUser.id
    },
    create: {
      code: "KARIGOFIRST",
      title: "KariGO First Order Launch Discount",
      description: "Launch discount for first-time KariGO customers.",
      discountType: PromoDiscountType.PERCENTAGE,
      discountValue: 10,
      maxDiscountAmount: 1000,
      minimumOrderAmount: 2000,
      usageLimitPerCustomer: 1,
      firstOrderOnly: true,
      startsAt: new Date("2025-01-01T00:00:00.000Z"),
      endsAt: new Date("2030-12-31T23:59:59.999Z"),
      isActive: true,
      createdByAdminId: adminUser.id
    }
  });
  const foodCategory = await prisma.vendorCategory.upsert({
    where: { slug: "food" },
    update: { name: "Food Vendors", isActive: true },
    create: { name: "Food Vendors", slug: "food", description: "Restaurants and prepared meals" }
  });
  await prisma.vendorCategory.upsert({
    where: { slug: "grocery" },
    update: { name: "Groceries", isActive: true },
    create: { name: "Groceries", slug: "grocery", description: "Grocery stores and supermarkets" }
  });
  await prisma.vendorCategory.upsert({
    where: { slug: "market" },
    update: { name: "Market", isActive: true },
    create: { name: "Market", slug: "market", description: "Local market vendors" }
  });

  const vendorUser = await prisma.user.upsert({
    where: { phoneNumber: "+2348000000101" },
    update: { accountStatus: AccountStatus.ACTIVE, phoneVerified: true },
    create: {
      fullName: "Kano Kitchen Vendor",
      phoneNumber: "+2348000000101",
      email: "vendor@karigo.local",
      passwordHash,
      role: UserRole.VENDOR,
      accountStatus: AccountStatus.ACTIVE,
      phoneVerified: true
    }
  });
  const vendor = await prisma.vendor.upsert({
    where: { userId: vendorUser.id },
    update: { status: VendorStatus.ACTIVE, isOpen: true, categoryId: foodCategory.id },
    create: {
      userId: vendorUser.id,
      categoryId: foodCategory.id,
      businessName: "Kano Kitchen",
      businessCategory: "FOOD",
      description: "Sample active KariGO food vendor",
      phoneNumber: "+2348000000101",
      email: "vendor@karigo.local",
      address: "Zoo Road",
      city: "Kano",
      state: "Kano",
      isOpen: true,
      status: VendorStatus.ACTIVE
    }
  });
  await upsertProduct(vendor.id, "Jollof Rice", {
    description: "Classic Nigerian jollof rice",
    category: "Rice",
    price: 2500,
    preparationTimeMinutes: 25
  });
  await upsertProduct(vendor.id, "Chicken Suya", {
    description: "Spiced grilled chicken",
    category: "Grill",
    price: 3000,
    preparationTimeMinutes: 30
  });

  const customerUser = await prisma.user.upsert({
    where: { phoneNumber: "+2348000000201" },
    update: { accountStatus: AccountStatus.ACTIVE, phoneVerified: true },
    create: {
      fullName: "KariGO Sample Customer",
      phoneNumber: "+2348000000201",
      email: "customer@karigo.local",
      passwordHash,
      role: UserRole.CUSTOMER,
      accountStatus: AccountStatus.ACTIVE,
      phoneVerified: true
    }
  });
  const customer = await prisma.customerProfile.upsert({
    where: { userId: customerUser.id },
    update: {},
    create: { userId: customerUser.id, referralCode: "KGO-SAMPLE" }
  });

  let address = await prisma.address.findFirst({ where: { userId: customerUser.id, label: "Home" } });
  address ??= await prisma.address.create({
    data: {
      userId: customerUser.id,
      label: "Home",
      addressLine: "Nassarawa GRA",
      city: "Kano",
      state: "Kano",
      isDefault: true
    }
  });

  await prisma.order.upsert({
    where: { orderNumber: "KGO-SEED-PARCEL-001" },
    update: {},
    create: {
      orderNumber: "KGO-SEED-PARCEL-001",
      customerId: customer.id,
      serviceCategory: ServiceCategory.PARCEL,
      orderStatus: OrderStatus.AWAITING_PAYMENT,
      paymentStatus: PaymentStatus.PENDING,
      pickupAddressId: address.id,
      deliveryAddressId: address.id,
      recipientName: "Sample Recipient",
      recipientPhone: "+2348000000301",
      itemDescription: "Sample document parcel",
      deliveryFee: 1500,
      totalAmount: 1500,
      statusHistory: {
        create: {
          newStatus: OrderStatus.AWAITING_PAYMENT,
          changedByUserId: customerUser.id,
          changedByRole: "CUSTOMER",
          note: "Seed parcel order"
        }
      }
    }
  });

  const riderUser = await prisma.user.upsert({
    where: { phoneNumber: "+2348000000401" },
    update: { accountStatus: AccountStatus.ACTIVE, phoneVerified: true },
    create: {
      fullName: "KariGO Sample Rider",
      phoneNumber: "+2348000000401",
      email: "rider@karigo.local",
      passwordHash,
      role: UserRole.RIDER,
      accountStatus: AccountStatus.ACTIVE,
      phoneVerified: true
    }
  });
  await prisma.rider.upsert({
    where: { userId: riderUser.id },
    update: {
      verificationStatus: RiderStatus.ACTIVE,
      availabilityStatus: RiderStatus.ONLINE
    },
    create: {
      userId: riderUser.id,
      riderCode: "KGO-RIDER-SAMPLE",
      phoneNumber: riderUser.phoneNumber,
      vehicleType: "Motorcycle",
      plateNumber: "KGO-001",
      verificationStatus: RiderStatus.ACTIVE,
      availabilityStatus: RiderStatus.ONLINE
    }
  });
}

main()
  .then(async () => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    throw error;
  });
