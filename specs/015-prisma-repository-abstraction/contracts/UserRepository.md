# Contract: UserRepository

**Layer**: Application
**Owner**: UsersModule
**DI Token**: `USER_REPOSITORY`
**Token Location**: `apps/api/src/modules/users/application/repositories/user.repository.ts`
**Interface Location**: `apps/api/src/modules/users/application/repositories/user.repository.ts`
**Implementation**: `PrismaUserRepository` at `apps/api/src/modules/users/infrastructure/repositories/prisma-user.repository.ts`

---

## Purpose

Defines the data access contract for the `User` domain entity. The application layer depends on this interface — never on Prisma types or `PrismaService`.

`User` is a global identity model (no `tenantId` filter required on read). It is looked up by `clerkUserId` for Clerk sync operations.

---

## Interface Definition

```typescript
export const USER_REPOSITORY = Symbol('USER_REPOSITORY');

export interface UserRecord {
  id: string;
  clerkUserId: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  createdAt: Date;
  updatedAt: Date;
}

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

export interface UserRepository {
  findById(id: string): Promise<UserRecord | null>;
  findByClerkUserId(clerkUserId: string): Promise<UserRecord | null>;
  create(input: CreateUserInput): Promise<UserRecord>;
  updateBasicProfile(id: string, input: UpdateUserProfileInput): Promise<UserRecord | null>;
}
```

---

## Method Contracts

### `findById(id: string): Promise<UserRecord | null>`
- Returns the user record with the given internal UUID.
- Returns `null` if no user with that ID exists.
- No `tenantId` filter — `User` is a global identity model.

### `findByClerkUserId(clerkUserId: string): Promise<UserRecord | null>`
- Returns the user record matching the given Clerk user ID.
- Returns `null` if no matching user exists.
- Used by Clerk sync operations and JWT guard lookups.

### `create(input: CreateUserInput): Promise<UserRecord>`
- Creates a new user record with the provided Clerk identity data.
- Throws (normalized from Prisma P2002) if `clerkUserId` already exists.
- Returns the created `UserRecord`.

### `updateBasicProfile(id: string, input: UpdateUserProfileInput): Promise<UserRecord | null>`
- Updates `email`, `firstName`, `lastName` fields for the user with the given ID.
- Returns `null` if no user with that ID exists.
- Returns the updated `UserRecord` on success.

---

## Constraints

- MUST NOT import `@prisma/client` or any Prisma type.
- MUST NOT accept `Request`, `ExecutionContext`, or JWT token as a parameter.
- MUST return `null` for not-found scenarios (not throw `NotFoundException`).
- MUST be mockable with a plain TypeScript object for unit testing.

---

## NestJS Provider Wiring

```typescript
// In UsersModule providers:
{
  provide: USER_REPOSITORY,
  useClass: PrismaUserRepository,
}
```

---

## Injection in Use Cases

```typescript
import { Inject, Injectable } from '@nestjs/common';
import { USER_REPOSITORY, UserRepository } from '../repositories/user.repository';

@Injectable()
export class GetCurrentUserUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly users: UserRepository,
  ) {}

  async execute(clerkUserId: string) {
    return this.users.findByClerkUserId(clerkUserId);
  }
}
```
