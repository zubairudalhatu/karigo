import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { NestExpressApplication } from "@nestjs/platform-express";
import { mkdirSync } from "fs";
import { join } from "path";
import { AppModule } from "./app.module";
import { configureApp } from "./app.setup";
import { configureSwagger } from "./swagger.setup";

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { rawBody: true });
  const config = app.get(ConfigService);
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
