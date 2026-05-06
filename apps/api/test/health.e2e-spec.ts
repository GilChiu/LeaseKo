import { INestApplication } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { Test, TestingModule } from "@nestjs/testing";
import request from "supertest";
import { appConfig } from "../src/common/config/app.config";
import { HealthModule } from "../src/modules/health/health.module";

/**
 * Minimal e2e test for GET /api/v1/health.
 *
 * Uses a minimal test module (ConfigModule + HealthModule only) —
 * no Prisma, Redis, BullMQ, or Clerk initialization required.
 * No Docker needed to run this test.
 */
describe("HealthController (e2e)", () => {
  let app: INestApplication;

  beforeAll(async () => {
    // Provide the minimum env vars that AppConfig reads.
    // ConfigModule.forRoot({ ignoreEnvFile: true }) reads process.env only.
    process.env.NODE_ENV = "test";
    process.env.PORT = "3002";
    process.env.FRONTEND_URL = "http://localhost:3000";

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [appConfig],
          ignoreEnvFile: true,
        }),
        HealthModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix("api/v1");
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it("GET /api/v1/health → 200 with all 5 fields", () => {
    return request(app.getHttpServer())
      .get("/api/v1/health")
      .expect(200)
      .expect((res: request.Response) => {
        expect(res.body.status).toBe("ok");
        expect(res.body.service).toBe("api");
        expect(typeof res.body.timestamp).toBe("string");
        expect(new Date(res.body.timestamp).toISOString()).toBe(
          res.body.timestamp,
        );
        expect(typeof res.body.uptime).toBe("number");
        expect(res.body.uptime).toBeGreaterThan(0);
        expect(typeof res.body.environment).toBe("string");
      });
  });
});
