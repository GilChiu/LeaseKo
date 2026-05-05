/**
 * UserRepository — application-layer interface for User data access.
 *
 * Architecture rules (NON-NEGOTIABLE per constitution):
 * - This interface MUST NOT import from @prisma/client or PrismaService.
 * - Use cases MUST inject this interface via USER_REPOSITORY token.
 * - Controllers MUST NOT inject PrismaService or PrismaUserRepository directly.
 *
 * @see apps/api/src/modules/users/infrastructure/repositories/prisma-user.repository.ts
 * @see docs/data-layer.md
 */
export const USER_REPOSITORY = Symbol("USER_REPOSITORY");

// ─────────────────────────────────────────────────────────────────────────────
// Output types
// ─────────────────────────────────────────────────────────────────────────────

export interface UserRecord {
  id: string;
  clerkUserId: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// ─────────────────────────────────────────────────────────────────────────────
// Input types
// ─────────────────────────────────────────────────────────────────────────────

export interface CreateUserInput {
  clerkUserId: string;
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
}

export interface UpdateUserProfileInput {
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Repository interface
// ─────────────────────────────────────────────────────────────────────────────

export interface UserRepository {
  /**
   * Find a user by their internal UUID.
   * Returns null if no user with that ID exists.
   */
  findById(id: string): Promise<UserRecord | null>;

  /**
   * Find a user by their Clerk user ID (e.g. "user_2abc123").
   * Returns null if no matching user exists.
   * Primary lookup used for Clerk sync and JWT guard resolution.
   */
  findByClerkUserId(clerkUserId: string): Promise<UserRecord | null>;

  /**
   * Create a new user record from Clerk identity data.
   * Throws if a user with the same clerkUserId already exists (P2002).
   */
  create(input: CreateUserInput): Promise<UserRecord>;

  /**
   * Update a user's basic profile fields.
   * Returns null if no user with the given ID exists.
   */
  updateBasicProfile(
    id: string,
    input: UpdateUserProfileInput,
  ): Promise<UserRecord | null>;
}
