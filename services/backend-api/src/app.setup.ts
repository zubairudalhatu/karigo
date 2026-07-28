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

function resolveCorsOrigins(config: ConfigService) {
  return config
    .get<string>("CORS_ORIGINS", "http://localhost:3000,http://localhost:3001")
    .split(",")
    .map((origin: string) => origin.trim().replace(/\/+$/, ""))
    .filter(Boolean);
}

function createCorsOriginGuard(origins: string[]) {
  return (origin: string | undefined, callback: (error: Error | null, allowed?: boolean) => void) => {
    if (!origin) {
      callback(null, true);
      return;
    }

    const normalized = origin.replace(/\/+$/, "");
    if (origins.includes(normalized)) {
      callback(null, true);
      return;
    }

    callback(new Error("CORS origin is not allowed"), false);
  };
}

export function configureApp(
  app: INestApplication,
  config: ConfigService,
  options: AppSetupOptions = {}
): void {
  const apiPrefix = normalizeApiPrefix(config.get<string>("API_PREFIX", "/api/v1"));
  const origins = resolveCorsOrigins(config);

  app.setGlobalPrefix(apiPrefix);
  app.enableCors({
    origin: createCorsOriginGuard(origins),
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Accept", "Authorization", "Content-Type", "X-Karigo-CSRF", "x-karigo-csrf"],
    maxAge: 86400
  });
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
