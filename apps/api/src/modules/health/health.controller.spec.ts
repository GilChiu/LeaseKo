import { ConfigService } from "@nestjs/config";
import { HealthController } from "./presentation/health.controller";

function mockConfigService(nodeEnv = "test"): ConfigService {
  return {
    getOrThrow: jest.fn().mockReturnValue({ nodeEnv }),
  } as unknown as ConfigService;
}

describe("HealthController", () => {
  let controller: HealthController;

  beforeEach(() => {
    controller = new HealthController(mockConfigService());
  });

  it('should return status "ok"', () => {
    const result = controller.check();
    expect(result.status).toBe("ok");
  });

  it('should return service "api"', () => {
    const result = controller.check();
    expect(result.service).toBe("api");
  });

  it("should return a valid ISO 8601 timestamp", () => {
    const result = controller.check();
    const parsed = Date.parse(result.timestamp);
    expect(Number.isNaN(parsed)).toBe(false);
    expect(new Date(result.timestamp).toISOString()).toBe(result.timestamp);
  });

  it("should return a positive uptime value", () => {
    const result = controller.check();
    expect(typeof result.uptime).toBe("number");
    expect(result.uptime).toBeGreaterThan(0);
  });

  it("should return the environment from ConfigService", () => {
    const envController = new HealthController(mockConfigService("production"));
    const result = envController.check();
    expect(result.environment).toBe("production");
  });
});
