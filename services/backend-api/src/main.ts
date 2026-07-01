import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { configureApp } from "./app.setup";
import { configureSwagger } from "./swagger.setup";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { rawBody: true });
  const config = app.get(ConfigService);
  configureApp(app, config);
  configureSwagger(app);

  const configuredPort = config.get<string>("APP_PORT") ?? "4000";
  const parsedPort = Number(process.env.PORT ?? configuredPort);
  const port = Number.isFinite(parsedPort) ? parsedPort : 4000;

  await app.listen(port, "0.0.0.0");
  console.log(`KariGO backend listening on port ${port}`);
}

void bootstrap();
