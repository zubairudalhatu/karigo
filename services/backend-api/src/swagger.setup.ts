import { INestApplication } from "@nestjs/common";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";

const SWAGGER_TAGS: Array<[string, string]> = [
  ["Health", "API availability and health checks"],
  ["Auth", "Registration, OTP verification, login and authenticated identity"],
  ["Users", "User account foundations"],
  ["Customers", "Customer profile and retention summary"],
  ["Addresses", "Customer-owned delivery addresses"],
  ["Vendors", "Vendor profiles and public vendor discovery"],
  ["Vendor Applications", "Public vendor application submission and status lookup"],
  ["Admin Vendor Applications", "Admin review workflow for public vendor applications"],
  ["Vendor Payout Accounts", "Vendor payout account submission and verification status"],
  ["Admin Vendor Payout Accounts", "Admin payout account review and verification workflow"],
  ["Products", "Public vendor product discovery"],
  ["Marketplace Discovery", "Category-first and vendor-first marketplace discovery"],
  ["Orders", "Customer vendor orders, parcel requests and tracking"],
  ["Payments", "Mock payment, webhook and refund workflows"],
  ["Vendor Dashboard Orders", "Vendor-owned order fulfilment workflow"],
  ["Rider Dispatch", "Rider availability, jobs, delivery and earnings"],
  ["Admin Dispatch", "Admin rider assignment and reassignment"],
  ["Admin Operations", "Admin dashboard, orders, users, vendors and riders"],
  ["Admin Reports", "Operations and finance reports"],
  ["Admin Settlements", "Vendor settlement and rider earning payouts"],
  ["Support", "Customer support ticket workflow"],
  ["Admin Support", "Admin support operations"],
  ["Service Provider Applications", "Public SME Services provider application submission and status lookup"],
  ["Admin Service Provider Applications", "Admin review workflow for SME Services provider applications"],
  ["Promos", "Customer promo validation"],
  ["Admin Promos", "Admin promotion management"],
  ["Admin Promo Reports", "Promotion performance reporting"],
  ["Notifications", "Authenticated user activity feed"],
  ["Admin Notifications", "Platform notification operations"]
];

export function configureSwagger(app: INestApplication): void {
  const builder = new DocumentBuilder()
    .setTitle("KariGO Backend API")
    .setDescription("API documentation for KariGO MVP delivery, logistics and local-commerce platform.")
    .setVersion("1.0.0")
    .addBearerAuth(
      {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description: "Enter the JWT access token returned by the login endpoint."
      },
      "bearer"
    );

  for (const [name, description] of SWAGGER_TAGS) {
    builder.addTag(name, description);
  }

  const document = SwaggerModule.createDocument(app, builder.build(), {
    operationIdFactory: (controllerKey, methodKey) => `${controllerKey}_${methodKey}`
  });

  SwaggerModule.setup("api/docs", app, document, {
    customSiteTitle: "KariGO Backend API",
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      tagsSorter: "alpha",
      operationsSorter: "method"
    }
  });
}
