import { Inject, Injectable } from "@nestjs/common";
import {
  USER_REPOSITORY,
  UserRecord,
  UserRepository,
} from "../repositories/user.repository";

/**
 * GetCurrentUserUseCase — returns the application User record for a given Clerk user ID.
 *
 * Architecture rules (NON-NEGOTIABLE per constitution):
 * - This use case MUST NOT import PrismaService or @prisma/client.
 * - Depends on UserRepository interface via USER_REPOSITORY token only.
 * - Accepts a plain string parameter — never an HTTP Request or JWT.
 *
 * @example
 * // In a controller:
 * const user = await this.getCurrentUser.execute(req.user.userId);
 */
@Injectable()
export class GetCurrentUserUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly users: UserRepository,
  ) {}

  async execute(clerkUserId: string): Promise<UserRecord | null> {
    return this.users.findByClerkUserId(clerkUserId);
  }
}
