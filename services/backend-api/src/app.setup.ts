import { INestApplication, ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import compression from "compression";
import helmet from "helmet";
import { AllExceptionsFilter } from "./common/filters/all-exceptions.filter";
import { ApiResponseInterceptor } from "./common/interceptors/api-response.interceptor";
import { normalizeApiPrefix } from "./config/environment";

interface AppSetupOptions {
  enableShutdownHooks?: boolean;
}

export function configureApp(
  app: INestApplication,
  config: ConfigService,
  options: AppSetupOptions = {}
): void {
  const apiPrefix = normalizeApiPrefix(config.get<string>("API_PREFIX", "/api/v1"));
  const origins = config
    .get<string>("CORS_ORIGINS", "http://localhost:3000,http://localhost:3001")
    .split(",")
    .map((origin: string) => origin.trim())
    .filter(Boolean);

  app.setGlobalPrefix(apiPrefix);
  app.enableCors({ origin: origins, credentials: true });
  app.use(helmet());
  app.use(compression());
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true
    })
  );
  app.useGlobalInterceptors(new ApiResponseInterceptor());
  app.useGlobalFilters(new AllExceptionsFilter());
  if (options.enableShutdownHooks !== false) {
    app.enableShutdownHooks();
  }
}
