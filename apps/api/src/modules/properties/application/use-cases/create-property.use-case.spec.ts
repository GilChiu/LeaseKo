import { CreatePropertyUseCase } from "./create-property.use-case";
import {
  PROPERTY_REPOSITORY,
  PropertyRepository,
} from "../repositories/property.repository";
import { CreatePropertyInput } from "../types/property-repository.types";
import { Property } from "../../domain/entities/property.entity";

/**
 * Unit tests for CreatePropertyUseCase.
 *
 * Architecture rules enforced by this test suite:
 * - No PrismaService, @prisma/client, or database imports.
 * - No HTTP/request context usage.
 * - No NestJS TestingModule — direct class instantiation.
 * - No real Clerk JWT verification.
 * - PropertyRepository is mocked entirely.
 *
 * What is NOT tested here (belongs to other test suites):
 * - CreatePropertyDto validation decorators
 * - PropertiesController routing
 * - Swagger decorators
 * - PrismaPropertyRepository integration
 * - Auth guard / @RequiresTenant() behavior
 */

// Suppress unused-variable warning for PROPERTY_REPOSITORY (imported for documentation only)
void PROPERTY_REPOSITORY;

describe("CreatePropertyUseCase", () => {
  const mockCreatedAt = new Date("2026-05-09T12:00:00.000Z");
  const mockUpdatedAt = new Date("2026-05-09T12:00:00.000Z");

  const mockInput: CreatePropertyInput = {
    tenantId: "tenant_test_123",
    name: "Sample Apartment Building",
    addressLine1: "123 Main Street",
    addressLine2: "Unit A",
    city: "Iloilo City",
    state: "Iloilo",
    postalCode: "5000",
    country: "Philippines",
    propertyType: "APARTMENT",
    description: "A sample rental property",
  };

  const mockProperty: Property = {
    id: "property_test_123",
    tenantId: "tenant_test_123",
    name: "Sample Apartment Building",
    addressLine1: "123 Main Street",
    addressLine2: "Unit A",
    city: "Iloilo City",
    state: "Iloilo",
    postalCode: "5000",
    country: "Philippines",
    propertyType: "APARTMENT",
    description: "A sample rental property",
    createdAt: mockCreatedAt,
    updatedAt: mockUpdatedAt,
    deletedAt: null,
  };

  const mockRepo: PropertyRepository = {
    create: jest.fn(),
    findManyByTenant: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
    softDelete: jest.fn(),
  };

  let useCase: CreatePropertyUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new CreatePropertyUseCase(mockRepo);
  });

  describe("execute", () => {
    it("returns the Property created by the repository", async () => {
      (mockRepo.create as jest.Mock).mockResolvedValueOnce(mockProperty);

      const result = await useCase.execute(mockInput);

      expect(result).toEqual(mockProperty);
    });

    it("calls repository.create exactly once", async () => {
      (mockRepo.create as jest.Mock).mockResolvedValueOnce(mockProperty);

      await useCase.execute(mockInput);

      expect(mockRepo.create).toHaveBeenCalledTimes(1);
    });

    it("passes the full input to repository.create", async () => {
      (mockRepo.create as jest.Mock).mockResolvedValueOnce(mockProperty);

      await useCase.execute(mockInput);

      expect(mockRepo.create).toHaveBeenCalledWith(mockInput);
    });

    it("forwards tenantId from input to repository.create", async () => {
      (mockRepo.create as jest.Mock).mockResolvedValueOnce(mockProperty);

      await useCase.execute(mockInput);

      expect(mockRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ tenantId: "tenant_test_123" }),
      );
    });

    it("does not call any other repository method", async () => {
      (mockRepo.create as jest.Mock).mockResolvedValueOnce(mockProperty);

      await useCase.execute(mockInput);

      expect(mockRepo.findManyByTenant).not.toHaveBeenCalled();
      expect(mockRepo.findById).not.toHaveBeenCalled();
      expect(mockRepo.update).not.toHaveBeenCalled();
      expect(mockRepo.softDelete).not.toHaveBeenCalled();
    });

    it("propagates repository errors without swallowing them", async () => {
      const repositoryError = new Error("Repository failure");
      (mockRepo.create as jest.Mock).mockRejectedValueOnce(repositoryError);

      await expect(useCase.execute(mockInput)).rejects.toThrow(
        "Repository failure",
      );
    });

    it("propagates the exact error thrown by the repository", async () => {
      const repositoryError = new Error("Repository failure");
      (mockRepo.create as jest.Mock).mockRejectedValueOnce(repositoryError);

      await expect(useCase.execute(mockInput)).rejects.toBe(repositoryError);
    });
  });
});
