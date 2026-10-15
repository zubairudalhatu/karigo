import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { NestExpressApplication } from "@nestjs/platform-express";
import { mkdirSync } from "fs";
import { join } from "path";
import { AppModule } from "./app.module";
import { configureApp } from "./app.setup";
import { configureSwagger } from "./swagger.setup";
import { CustomerErasureService } from "./modules/account-deletion/customer-erasure.service";
import { assertRestoreReplayGate } from "./modules/account-deletion/restore-deletion-replay";
import { PrismaService } from "./prisma/prisma.service";
import { CustomerDeletionNoticeService } from "./modules/account-deletion/customer-deletion-notice.service";

async function bootstrap() {
  let restoreDb: PrismaService | undefined;
  try {
    await assertRestoreReplayGate(async item => {
      restoreDb ??= new PrismaService();
      // Only the erasure service is instantiated before the gate: no app workers,
      // listeners, provider vends or notification modules can start on restored PII.
      const service = new CustomerErasureService(restoreDb, new CustomerDeletionNoticeService(new ConfigService(process.env)));
      await service.replayTombstone(item);
    });
  } finally { await restoreDb?.onModuleDestroy(); }
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { rawBody: true });
  const config = app.get(ConfigService);
  // No public listener or static assets until the isolated restore is sanitized.
  const uploadsDirectory = join(process.cwd(), "uploads");
  mkdirSync(uploadsDirectory, { recursive: true });
  app.useStaticAssets(uploadsDirectory, { prefix: "/uploads/" });
  configureApp(app, config);
  configureSwagger(app);

  const configuredPort = config.get<string>("APP_PORT") ?? "4000";
  const parsedPort = Number(process.env.PORT ?? configuredPort);
  const port = Number.isFinite(parsedPort) ? parsedPort : 4000;

  await app.listen(port, "0.0.0.0");
  console.log(`KariGO backend listening on port ${port}`);
}

void bootstrap();
