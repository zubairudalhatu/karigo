import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { validateEnvironment } from "./config/environment";
import { DomainModule } from "./domain/domain.module";
import { AuthModule } from "./modules/auth/auth.module";
import { AddressesModule } from "./modules/addresses/addresses.module";
import { AdsModule } from "./modules/ads/ads.module";
import { AdminOperationsModule } from "./modules/admin-operations/admin-operations.module";
import { CustomersModule } from "./modules/customers/customers.module";
import { DispatchModule } from "./modules/dispatch/dispatch.module";
import { HealthModule } from "./modules/health/health.module";
import { OrdersModule } from "./modules/orders/orders.module";
import { NotificationsModule } from "./modules/notifications/notifications.module";
import { PaymentsModule } from "./modules/payments/payments.module";
import { ProductsModule } from "./modules/products/products.module";
import { MarketplaceDiscoveryModule } from "./modules/marketplace-discovery/marketplace-discovery.module";
import { PromoModule } from "./modules/promos/promo.module";
import { RidersModule } from "./modules/riders/riders.module";
import { ReferralsModule } from "./modules/referrals/referrals.module";
import { SupportModule } from "./modules/support/support.module";
import { TaxiModule } from "./modules/taxi/taxi.module";
import { UsersModule } from "./modules/users/users.module";
import { UtilitiesModule } from "./modules/utilities/utilities.module";
import { VendorApplicationsModule } from "./modules/vendor-applications/vendor-applications.module";
import { VendorPayoutAccountsModule } from "./modules/vendor-payout-accounts/vendor-payout-accounts.module";
import { VendorsModule } from "./modules/vendors/vendors.module";
import { VendorDashboardOrdersModule } from "./modules/vendor-dashboard-orders/vendor-dashboard-orders.module";
import { VendorSettlementsModule } from "./modules/vendor-settlements/vendor-settlements.module";
import { WalletModule } from "./modules/wallet/wallet.module";
import { PrismaModule } from "./prisma/prisma.module";
import { SecurityModule } from "./security/security.module";
import { AdminAuditModule } from "./common/services/admin-audit.module";
import { ServiceProviderApplicationsModule } from "./modules/service-provider-applications/service-provider-applications.module";
import { ServiceProviderRequestsModule } from "./modules/service-provider-requests/service-provider-requests.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnvironment
    }),
    PrismaModule,
    AdminAuditModule,
    SecurityModule,
    HealthModule,
    UsersModule,
    UtilitiesModule,
    ServiceProviderApplicationsModule,
    ServiceProviderRequestsModule,
    VendorApplicationsModule,
    VendorPayoutAccountsModule,
    WalletModule,
    ReferralsModule,
    AuthModule,
    CustomersModule,
    AddressesModule,
    AdsModule,
    VendorsModule,
    ProductsModule,
    MarketplaceDiscoveryModule,
    PromoModule,
    RidersModule,
    OrdersModule,
    NotificationsModule,
    PaymentsModule,
    VendorDashboardOrdersModule,
    VendorSettlementsModule,
    DispatchModule,
    SupportModule,
    TaxiModule,
    AdminOperationsModule,
    DomainModule
  ]
})
export class AppModule {}
