import {
  AccountStatus,
  AdminRole,
  OrderStatus,
  PaymentStatus,
  PayoutAccountStatus,
  ProductCategory,
  PromoDiscountType,
  PrismaClient,
  RiderStatus,
  ServiceCategory,
  UtilityServiceType,
  UserRole,
  VendorStatus
} from "@prisma/client";
import { hash } from "bcrypt";
import {
  DEMO_ACCOUNT_PHONES,
  demoCredentialUpdate,
  isDemoCredentialResetRequested,
  isStagingDemoCredentialResetEnabled,
  stagingSeedMessages
} from "../src/seed/demo-seed-controls";

const prisma = new PrismaClient();

type SeedProductOptionGroup = {
  name: string;
  required?: boolean;
  minSelections?: number;
  maxSelections?: number;
  displayOrder?: number;
  options: {
    name: string;
    priceAdjustmentKobo: number;
    available?: boolean;
    displayOrder?: number;
  }[];
};

async function upsertProduct(vendorId: string, name: string, data: {
  description: string;
  category: string;
  productCategory: ProductCategory;
  price: number;
  imageUrl: string;
  preparationTimeMinutes: number;
  isFeatured?: boolean;
  optionGroups?: SeedProductOptionGroup[];
}) {
  const { optionGroups, ...productData } = data;
  const existing = await prisma.product.findFirst({ where: { vendorId, name } });
  const product = existing
    ? await prisma.product.update({ where: { id: existing.id }, data: { ...productData, isActive: true, isAvailable: true } })
    : await prisma.product.create({ data: { vendorId, name, ...productData } });

  if (optionGroups) {
    await prisma.productOptionGroup.updateMany({ where: { productId: product.id }, data: { isActive: false } });
    for (const [groupIndex, group] of optionGroups.entries()) {
      const minSelections = group.minSelections ?? (group.required ? 1 : 0);
      const maxSelections = group.maxSelections ?? Math.max(1, minSelections);
      await prisma.productOptionGroup.create({
        data: {
          productId: product.id,
          name: group.name,
          required: group.required ?? false,
          minSelections,
          maxSelections,
          displayOrder: group.displayOrder ?? groupIndex,
          options: {
            create: group.options.map((option, optionIndex) => ({
              name: option.name,
              priceAdjustmentKobo: option.priceAdjustmentKobo,
              available: option.available ?? true,
              displayOrder: option.displayOrder ?? optionIndex
            }))
          }
        }
      });
    }
  }

  return product;
}

async function upsertUtilityProvider(type: UtilityServiceType, name: string, code: string, metadata?: Record<string, unknown>) {
  return prisma.utilityProvider.upsert({
    where: { code },
    update: { type, name, isActive: true, metadata },
    create: { type, name, code, isActive: true, metadata }
  });
}

async function upsertUtilityProduct(providerId: string, type: UtilityServiceType, name: string, code: string, data: {
  amountKobo?: number;
  minAmountKobo?: number;
  maxAmountKobo?: number;
  metadata?: Record<string, unknown>;
}) {
  return prisma.utilityProduct.upsert({
    where: { code },
    update: {
      providerId,
      type,
      name,
      amountKobo: data.amountKobo,
      minAmountKobo: data.minAmountKobo,
      maxAmountKobo: data.maxAmountKobo,
      metadata: data.metadata,
      isActive: true
    },
    create: {
      providerId,
      type,
      name,
      code,
      amountKobo: data.amountKobo,
      minAmountKobo: data.minAmountKobo,
      maxAmountKobo: data.maxAmountKobo,
      metadata: data.metadata,
      isActive: true
    }
  });
}

async function seedUtilityCatalogue() {
  const airtimeProviders = [
    ["MTN", "DEMO_MTN_AIRTIME_PROVIDER"],
    ["Airtel", "DEMO_AIRTEL_AIRTIME_PROVIDER"],
    ["Glo", "DEMO_GLO_AIRTIME_PROVIDER"],
    ["9mobile", "DEMO_9MOBILE_AIRTIME_PROVIDER"]
  ] as const;
  for (const [name, code] of airtimeProviders) {
    const provider = await upsertUtilityProvider(UtilityServiceType.AIRTIME, name, code, { demoOnly: true });
    await upsertUtilityProduct(provider.id, UtilityServiceType.AIRTIME, `${name} Airtime Variable Amount`, code.replace("_PROVIDER", ""), {
      minAmountKobo: 10000,
      maxAmountKobo: 10000000,
      metadata: { demoOnly: true, variableAmount: true }
    });
  }

  const dataProviders = [
    ["MTN Data", "DEMO_MTN_DATA_PROVIDER", "MTN 1GB Data Demo Plan", "DEMO_MTN_1GB", 50000],
    ["Airtel Data", "DEMO_AIRTEL_DATA_PROVIDER", "Airtel 2GB Data Demo Plan", "DEMO_AIRTEL_2GB", 100000],
    ["Glo Data", "DEMO_GLO_DATA_PROVIDER", "Glo 1.5GB Data Demo Plan", "DEMO_GLO_15GB", 75000],
    ["9mobile Data", "DEMO_9MOBILE_DATA_PROVIDER", "9mobile 1GB Data Demo Plan", "DEMO_9MOBILE_1GB", 50000]
  ] as const;
  for (const [providerName, providerCode, productName, productCode, amountKobo] of dataProviders) {
    const provider = await upsertUtilityProvider(UtilityServiceType.DATA, providerName, providerCode, { demoOnly: true });
    await upsertUtilityProduct(provider.id, UtilityServiceType.DATA, productName, productCode, {
      amountKobo,
      minAmountKobo: amountKobo,
      maxAmountKobo: amountKobo,
      metadata: { demoOnly: true }
    });
  }

  const electricityProviders = [
    ["Kano Electricity Distribution Company", "DEMO_KEDCO_PROVIDER", "KEDCO Electricity Demo", "DEMO_KEDCO_PREPAID"],
    ["Abuja Electricity Distribution Company", "DEMO_AEDC_PROVIDER", "AEDC Electricity Demo", "DEMO_AEDC_PREPAID"],
    ["Kaduna Electric", "DEMO_KADUNA_ELECTRIC_PROVIDER", "Kaduna Electric Demo", "DEMO_KADUNA_PREPAID"],
    ["Eko Electricity Distribution Company", "DEMO_EKEDC_PROVIDER", "Eko Electricity Demo", "DEMO_EKEDC_PREPAID"],
    ["Ikeja Electric", "DEMO_IKEDC_PROVIDER", "Ikeja Electric Demo", "DEMO_IKEDC_PREPAID"]
  ] as const;
  for (const [providerName, providerCode, productName, productCode] of electricityProviders) {
    const provider = await upsertUtilityProvider(UtilityServiceType.ELECTRICITY, providerName, providerCode, { demoOnly: true });
    await upsertUtilityProduct(provider.id, UtilityServiceType.ELECTRICITY, productName, productCode, {
      minAmountKobo: 50000,
      maxAmountKobo: 50000000,
      metadata: { demoOnly: true, variableAmount: true }
    });
  }

  const cableProviders = [
    ["DSTV", "DEMO_DSTV_PROVIDER", "DSTV Compact Demo", "DEMO_DSTV_COMPACT", 1200000],
    ["GOtv", "DEMO_GOTV_PROVIDER", "GOtv Jolli Demo", "DEMO_GOTV_JOLLI", 485000],
    ["Startimes", "DEMO_STARTIMES_PROVIDER", "Startimes Basic Demo", "DEMO_STARTIMES_BASIC", 250000]
  ] as const;
  for (const [providerName, providerCode, productName, productCode, amountKobo] of cableProviders) {
    const provider = await upsertUtilityProvider(UtilityServiceType.CABLE_TV, providerName, providerCode, { demoOnly: true });
    await upsertUtilityProduct(provider.id, UtilityServiceType.CABLE_TV, productName, productCode, {
      amountKobo,
      minAmountKobo: amountKobo,
      maxAmountKobo: amountKobo,
      metadata: { demoOnly: true }
    });
  }
}

async function main() {
  const seedPassword = process.env.SEED_DEMO_PASSWORD ?? "ChangeMe123!";
  const passwordHash = await hash(seedPassword, 10);
  const superAdminPasswordHash = await hash(process.env.SUPER_ADMIN_PASSWORD ?? seedPassword, 10);
  const resetDemoCredentials = isStagingDemoCredentialResetEnabled();
  if (isDemoCredentialResetRequested() && !resetDemoCredentials) {
    console.warn("Credential reset requested but skipped: APP_ENV must be staging.");
  }
  const superAdminPhone = process.env.SUPER_ADMIN_PHONE ?? "+2348000000000";
  const superAdminEmail = process.env.SUPER_ADMIN_EMAIL ?? "admin@karigo.local";
  const superAdminName = process.env.SUPER_ADMIN_NAME ?? "KariGO Super Admin";
  const adminUser = await prisma.user.upsert({
    where: { phoneNumber: superAdminPhone },
    update: {
      fullName: superAdminName,
      email: superAdminEmail,
      accountStatus: AccountStatus.ACTIVE,
      adminRole: AdminRole.SUPER_ADMIN,
      phoneVerified: true,
      ...demoCredentialUpdate(resetDemoCredentials, superAdminPasswordHash)
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
    where: { phoneNumber: DEMO_ACCOUNT_PHONES.operationsAdmin },
    update: {
      accountStatus: AccountStatus.ACTIVE,
      adminRole: AdminRole.OPERATIONS_ADMIN,
      phoneVerified: true,
      ...demoCredentialUpdate(resetDemoCredentials, passwordHash)
    },
    create: {
      fullName: "KariGO Demo Operations Admin",
      phoneNumber: DEMO_ACCOUNT_PHONES.operationsAdmin,
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
  const groceryCategory = await prisma.vendorCategory.upsert({
    where: { slug: "grocery" },
    update: { name: "Groceries", isActive: true },
    create: { name: "Groceries", slug: "grocery", description: "Grocery stores and supermarkets" }
  });
  const marketCategory = await prisma.vendorCategory.upsert({
    where: { slug: "market" },
    update: { name: "Market", isActive: true },
    create: { name: "Market", slug: "market", description: "Local market vendors" }
  });
  await prisma.vendorCategory.upsert({
    where: { slug: "pharmacy" },
    update: { name: "Pharmacy", isActive: true },
    create: { name: "Pharmacy", slug: "pharmacy", description: "Compliance-gated pharmacy and health vendors" }
  });

  const vendorUser = await prisma.user.upsert({
    where: { phoneNumber: DEMO_ACCOUNT_PHONES.vendorOwner },
    update: {
      accountStatus: AccountStatus.ACTIVE,
      phoneVerified: true,
      ...demoCredentialUpdate(resetDemoCredentials, passwordHash)
    },
    create: {
      fullName: "Kano Kitchen Vendor",
      phoneNumber: DEMO_ACCOUNT_PHONES.vendorOwner,
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
      phoneNumber: DEMO_ACCOUNT_PHONES.vendorOwner,
      email: "vendor@karigo.local",
      address: "Zoo Road",
      city: "Kano",
      state: "Kano",
      isOpen: true,
      status: VendorStatus.ACTIVE
    }
  });
  await prisma.vendorPayoutAccount.upsert({
    where: { vendorId: vendor.id },
    update: {
      accountName: "Kano Kitchen Vendor",
      bankName: "KariGO Demo Bank",
      bankCode: "KGO",
      accountNumber: "0000000201",
      maskedAccountNumber: "**** **** 0201",
      status: PayoutAccountStatus.VERIFIED,
      verifiedAt: new Date(),
      verifiedByAdminId: superAdmin.id,
      rejectionReason: null,
      vendorVisibleNote: "Demo payout account verified for staging settlement review.",
      internalNote: null
    },
    create: {
      vendorId: vendor.id,
      accountName: "Kano Kitchen Vendor",
      bankName: "KariGO Demo Bank",
      bankCode: "KGO",
      accountNumber: "0000000201",
      maskedAccountNumber: "**** **** 0201",
      status: PayoutAccountStatus.VERIFIED,
      verifiedAt: new Date(),
      verifiedByAdminId: superAdmin.id,
      vendorVisibleNote: "Demo payout account verified for staging settlement review."
    }
  });
  await upsertProduct(vendor.id, "Jollof Rice", {
    description: "Smoky party-style jollof rice served fresh.",
    category: "Rice",
    productCategory: ProductCategory.FOOD,
    price: 2500,
    imageUrl: "https://images.unsplash.com/photo-1604908176997-125f25cc6f3d",
    preparationTimeMinutes: 25,
    isFeatured: true,
    optionGroups: [
      {
        name: "Protein choice",
        required: true,
        minSelections: 1,
        maxSelections: 1,
        options: [
          { name: "Chicken", priceAdjustmentKobo: 80000 },
          { name: "Beef", priceAdjustmentKobo: 60000 },
          { name: "No protein", priceAdjustmentKobo: 0 }
        ]
      },
      {
        name: "Drink add-on",
        required: false,
        minSelections: 0,
        maxSelections: 1,
        options: [
          { name: "Zobo", priceAdjustmentKobo: 70000 },
          { name: "Bottled water", priceAdjustmentKobo: 30000 }
        ]
      }
    ]
  });
  await upsertProduct(vendor.id, "Chicken Suya", {
    description: "Spiced grilled chicken with suya pepper.",
    category: "Grill",
    productCategory: ProductCategory.FOOD,
    price: 3000,
    imageUrl: "https://images.unsplash.com/photo-1598515214211-89d3c73ae83b",
    preparationTimeMinutes: 30,
    isFeatured: true,
    optionGroups: [
      {
        name: "Spice level",
        required: true,
        minSelections: 1,
        maxSelections: 1,
        options: [
          { name: "Mild", priceAdjustmentKobo: 0 },
          { name: "Medium", priceAdjustmentKobo: 0 },
          { name: "Extra spicy", priceAdjustmentKobo: 0 }
        ]
      },
      {
        name: "Extras",
        required: false,
        minSelections: 0,
        maxSelections: 2,
        options: [
          { name: "Extra onions", priceAdjustmentKobo: 20000 },
          { name: "Extra suya pepper", priceAdjustmentKobo: 15000 }
        ]
      }
    ]
  });
  await upsertProduct(vendor.id, "Beef Shawarma", {
    description: "Warm beef shawarma with vegetables and sauce.",
    category: "Wraps",
    productCategory: ProductCategory.FOOD,
    price: 2200,
    imageUrl: "https://images.unsplash.com/photo-1662116765994-1e4200c43589",
    preparationTimeMinutes: 20
  });
  await upsertProduct(vendor.id, "Grilled Chicken", {
    description: "Tender grilled chicken with local spices.",
    category: "Grill",
    productCategory: ProductCategory.FOOD,
    price: 4500,
    imageUrl: "https://images.unsplash.com/photo-1532550907401-a500c9a57435",
    preparationTimeMinutes: 35
  });
  await upsertProduct(vendor.id, "Meat Pie", {
    description: "Fresh pastry filled with seasoned minced beef.",
    category: "Snacks",
    productCategory: ProductCategory.FOOD,
    price: 900,
    imageUrl: "https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9",
    preparationTimeMinutes: 15
  });
  await upsertProduct(vendor.id, "Zobo Drink", {
    description: "Chilled hibiscus drink with ginger notes.",
    category: "Drinks",
    productCategory: ProductCategory.FOOD,
    price: 700,
    imageUrl: "https://images.unsplash.com/photo-1544145945-f90425340c7e",
    preparationTimeMinutes: 10
  });

  const groceryUser = await prisma.user.upsert({
    where: { phoneNumber: DEMO_ACCOUNT_PHONES.groceryVendorOwner },
    update: {
      accountStatus: AccountStatus.ACTIVE,
      phoneVerified: true,
      ...demoCredentialUpdate(resetDemoCredentials, passwordHash)
    },
    create: {
      fullName: "Kano Fresh Mart Vendor",
      phoneNumber: DEMO_ACCOUNT_PHONES.groceryVendorOwner,
      email: "grocery-vendor@karigo.local",
      passwordHash,
      role: UserRole.VENDOR,
      accountStatus: AccountStatus.ACTIVE,
      phoneVerified: true
    }
  });
  const groceryVendor = await prisma.vendor.upsert({
    where: { userId: groceryUser.id },
    update: { status: VendorStatus.ACTIVE, isOpen: true, categoryId: groceryCategory.id, businessCategory: "GROCERY" },
    create: {
      userId: groceryUser.id,
      categoryId: groceryCategory.id,
      businessName: "Kano Fresh Mart",
      businessCategory: "GROCERY",
      description: "Sample KariGO grocery vendor",
      phoneNumber: DEMO_ACCOUNT_PHONES.groceryVendorOwner,
      email: "grocery-vendor@karigo.local",
      address: "Nasarawa GRA",
      city: "Kano",
      state: "Kano",
      isOpen: true,
      status: VendorStatus.ACTIVE
    }
  });
  const groceryProducts = [
    ["5kg Rice", "Bag of clean long-grain rice for home meals.", "Grains", 7800, "https://images.unsplash.com/photo-1536304993881-ff6e9eefa2a6"],
    ["Indomie Super Pack", "Family-size pack of instant noodles.", "Noodles", 4200, "https://images.unsplash.com/photo-1612927601601-6638404737ce"],
    ["Vegetable Oil", "Bottle of cooking oil for everyday kitchen use.", "Cooking Oil", 3600, "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5"],
    ["Fresh Eggs", "Crate of fresh eggs from local suppliers.", "Eggs", 4500, "https://images.unsplash.com/photo-1506976785307-8732e854ad03"],
    ["Peak Milk", "Tin milk for tea, pap and breakfast meals.", "Dairy", 1200, "https://images.unsplash.com/photo-1563636619-e9143da7973b"],
    ["Golden Penny Spaghetti", "Pack of spaghetti for quick family meals.", "Pasta", 1100, "https://images.unsplash.com/photo-1551462147-ff29053bfc14"]
  ] as const;
  for (const [name, description, category, price, imageUrl] of groceryProducts) {
    await upsertProduct(groceryVendor.id, name, {
      description,
      category,
      productCategory: ProductCategory.GROCERIES,
      price,
      imageUrl,
      preparationTimeMinutes: 10,
      isFeatured: name === "5kg Rice" || name === "Fresh Eggs"
    });
  }

  const marketUser = await prisma.user.upsert({
    where: { phoneNumber: DEMO_ACCOUNT_PHONES.marketVendorOwner },
    update: {
      accountStatus: AccountStatus.ACTIVE,
      phoneVerified: true,
      ...demoCredentialUpdate(resetDemoCredentials, passwordHash)
    },
    create: {
      fullName: "Kano Everyday Market Vendor",
      phoneNumber: DEMO_ACCOUNT_PHONES.marketVendorOwner,
      email: "market-vendor@karigo.local",
      passwordHash,
      role: UserRole.VENDOR,
      accountStatus: AccountStatus.ACTIVE,
      phoneVerified: true
    }
  });
  const marketVendor = await prisma.vendor.upsert({
    where: { userId: marketUser.id },
    update: { status: VendorStatus.ACTIVE, isOpen: true, categoryId: marketCategory.id, businessCategory: "MARKET" },
    create: {
      userId: marketUser.id,
      categoryId: marketCategory.id,
      businessName: "Kano Everyday Market",
      businessCategory: "MARKET",
      description: "Sample KariGO market-items vendor",
      phoneNumber: DEMO_ACCOUNT_PHONES.marketVendorOwner,
      email: "market-vendor@karigo.local",
      address: "Kano City Centre",
      city: "Kano",
      state: "Kano",
      isOpen: true,
      status: VendorStatus.ACTIVE
    }
  });
  const marketProducts = [
    ["Detergent", "Large pack detergent for laundry and cleaning.", "Household", 2500, "https://images.unsplash.com/photo-1626806819282-2c1dc01a5e0c"],
    ["Bathing Soap", "Pack of bathing soap for daily home use.", "Personal Care", 1500, "https://images.unsplash.com/photo-1607006483224-53bb897d7a2f"],
    ["Toothpaste", "Family toothpaste for daily dental care.", "Personal Care", 1300, "https://images.unsplash.com/photo-1606811841689-23dfddce3e95"],
    ["Tissue Paper", "Soft tissue paper pack for household use.", "Household", 1800, "https://images.unsplash.com/photo-1584556812952-905ffd0c611a"],
    ["Cooking Gas Refill Voucher", "Placeholder voucher request for manual cooking gas refill follow-up.", "Household", 5000, "https://images.unsplash.com/photo-1581092160607-ee22731c031f"],
    ["Household Cleaning Pack", "Combined cleaning essentials for quick restock.", "Household", 6200, "https://images.unsplash.com/photo-1585421514738-01798e348b17"]
  ] as const;
  for (const [name, description, category, price, imageUrl] of marketProducts) {
    await upsertProduct(marketVendor.id, name, {
      description,
      category,
      productCategory: ProductCategory.MARKET_ITEMS,
      price,
      imageUrl,
      preparationTimeMinutes: 10,
      isFeatured: name === "Detergent" || name === "Household Cleaning Pack",
      optionGroups: name === "Household Cleaning Pack" ? [
        {
          name: "Add-on pack",
          required: false,
          minSelections: 0,
          maxSelections: 2,
          options: [
            { name: "Extra tissue pack", priceAdjustmentKobo: 180000 },
            { name: "Small detergent refill", priceAdjustmentKobo: 120000 }
          ]
        }
      ] : undefined
    });
  }

  const customerUser = await prisma.user.upsert({
    where: { phoneNumber: DEMO_ACCOUNT_PHONES.customer },
    update: {
      accountStatus: AccountStatus.ACTIVE,
      phoneVerified: true,
      ...demoCredentialUpdate(resetDemoCredentials, passwordHash)
    },
    create: {
      fullName: "KariGO Sample Customer",
      phoneNumber: DEMO_ACCOUNT_PHONES.customer,
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
    where: { phoneNumber: DEMO_ACCOUNT_PHONES.rider },
    update: {
      accountStatus: AccountStatus.ACTIVE,
      phoneVerified: true,
      ...demoCredentialUpdate(resetDemoCredentials, passwordHash)
    },
    create: {
      fullName: "KariGO Sample Rider",
      phoneNumber: DEMO_ACCOUNT_PHONES.rider,
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

  await seedUtilityCatalogue();

  stagingSeedMessages(resetDemoCredentials).forEach((message) => console.info(message));
  console.info("Demo Bills & Utilities catalogue ensured");
}

main()
  .then(async () => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    throw error;
  });
