import { Injectable } from "@nestjs/common";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import { PrismaService } from "../../../../database/prisma/prisma.service";
import {
  CreateUserInput,
  UpdateUserProfileInput,
  UserRecord,
  UserRepository,
} from "../../application/repositories/user.repository";

/**
 * PrismaUserRepository — infrastructure implementation of UserRepository.
 *
 * Architecture rules (NON-NEGOTIABLE per constitution):
 * - This class is the ONLY place where PrismaService may be used for User data.
 * - Application layer (use cases) MUST inject UserRepository via USER_REPOSITORY token.
 * - Controllers MUST NOT inject this class directly.
 *
 * Error normalization:
 * - P2025 (record not found on update)  → returns null
 * - P2002 (unique constraint violation) → throws a descriptive Error
 */
@Injectable()
export class PrismaUserRepository implements UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<UserRecord | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async findByClerkUserId(clerkUserId: string): Promise<UserRecord | null> {
    return this.prisma.user.findUnique({ where: { clerkUserId } });
  }

  async create(input: CreateUserInput): Promise<UserRecord> {
    try {
      return await this.prisma.user.create({ data: input });
    } catch (e) {
      if (e instanceof PrismaClientKnownRequestError && e.code === "P2002") {
        throw new Error(
          `User already exists with clerkUserId: ${input.clerkUserId}`,
        );
      }
      throw e;
    }
  }

  async updateBasicProfile(
    id: string,
    input: UpdateUserProfileInput,
  ): Promise<UserRecord | null> {
    try {
      return await this.prisma.user.update({ where: { id }, data: input });
    } catch (e) {
      if (e instanceof PrismaClientKnownRequestError && e.code === "P2025") {
        return null;
      }
      throw e;
    }
  }
}
