import { HealthController } from "./health.controller";

describe("HealthController", () => {
  let controller: HealthController;

  beforeEach(() => {
    controller = new HealthController();
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
});
