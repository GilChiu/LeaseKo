import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { AppModule } from "./app.module";
import { GlobalExceptionFilter } from "./common/filters/global-exception.filter";
import type { AppConfig } from "./common/config/app.config";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);
  const { port, frontendUrl, nodeEnv } =
    configService.getOrThrow<AppConfig>("app");

  app.setGlobalPrefix("api/v1");
  app.enableCors({ origin: frontendUrl });
  app.useGlobalFilters(new GlobalExceptionFilter(nodeEnv));
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  if (nodeEnv !== "production") {
    const config = new DocumentBuilder()
      .setTitle("Property Management SaaS API")
      .setDescription(
        "API documentation for the multi-tenant Property Management SaaS backend.",
      )
      .setVersion("1.0.0")
      .addBearerAuth()
      .addTag("Invoices", "Create, list, and view tenant invoices")
      .addTag("Payments", "Record payments and view payment history")
      .addTag("Maintenance", "Create, list, and update maintenance requests")
      .addTag("Dashboard", "Occupancy, revenue, and summary analytics")
      .build();
    const document = SwaggerModule.createDocument(app, config, {
      ignoreGlobalPrefix: true,
    });
    SwaggerModule.setup("api/docs", app, document);
  }

  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`API running on http://localhost:${port}`);
  if (nodeEnv !== "production") {
    // eslint-disable-next-line no-console
    console.log(`Swagger UI available at http://localhost:${port}/api/docs`);
  }
}

void bootstrap();
