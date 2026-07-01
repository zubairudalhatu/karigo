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

  await app.listen(config.get<number>("APP_PORT", 4000));
}

void bootstrap();
