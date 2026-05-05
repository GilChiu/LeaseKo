import { GetCurrentUserUseCase } from "./get-current-user.use-case";
import {
  UserRecord,
  UserRepository,
} from "../repositories/user.repository";

describe("GetCurrentUserUseCase", () => {
  const mockUser: UserRecord = {
    id: "user-uuid-1",
    clerkUserId: "user_clerk123",
    email: "test@example.com",
    firstName: "Test",
    lastName: "User",
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  };

  const mockRepo: UserRepository = {
    findById: jest.fn(),
    findByClerkUserId: jest.fn(),
    create: jest.fn(),
    updateBasicProfile: jest.fn(),
  };

  let useCase: GetCurrentUserUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new GetCurrentUserUseCase(mockRepo);
  });

  describe("execute", () => {
    it("returns the user record for a known clerkUserId", async () => {
      (mockRepo.findByClerkUserId as jest.Mock).mockResolvedValueOnce(mockUser);

      const result = await useCase.execute("user_clerk123");

      expect(result).toEqual(mockUser);
      expect(mockRepo.findByClerkUserId).toHaveBeenCalledWith("user_clerk123");
      expect(mockRepo.findByClerkUserId).toHaveBeenCalledTimes(1);
    });

    it("returns null for an unknown clerkUserId", async () => {
      (mockRepo.findByClerkUserId as jest.Mock).mockResolvedValueOnce(null);

      const result = await useCase.execute("user_unknown");

      expect(result).toBeNull();
      expect(mockRepo.findByClerkUserId).toHaveBeenCalledWith("user_unknown");
    });

    it("does not call any other repository method", async () => {
      (mockRepo.findByClerkUserId as jest.Mock).mockResolvedValueOnce(mockUser);

      await useCase.execute("user_clerk123");

      expect(mockRepo.findById).not.toHaveBeenCalled();
      expect(mockRepo.create).not.toHaveBeenCalled();
      expect(mockRepo.updateBasicProfile).not.toHaveBeenCalled();
    });
  });
});
