import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

/**
 * DatabaseModule — provides PrismaService globally.
 *
 * Marked @Global so all modules can inject PrismaService without listing
 * DatabaseModule in their own imports array.
 *
 * Feature 005 (Prisma Integration) will:
 * - Install @prisma/client and initialize the Prisma schema
 * - Replace the PrismaService placeholder with a real PrismaClient extension
 * - Add tenant-scoped query middleware
 */
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class DatabaseModule {}
