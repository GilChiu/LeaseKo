import { Module } from '@nestjs/common';
import { TENANT_CONTACT_REPOSITORY } from './application/repositories/tenant-contact.repository';
import { CreateTenantContactUseCase } from './application/use-cases/create-tenant-contact.use-case';
import { GetTenantContactByIdUseCase } from './application/use-cases/get-tenant-contact-by-id.use-case';
import { ListTenantContactsUseCase } from './application/use-cases/list-tenant-contacts.use-case';
import { UpdateTenantContactUseCase } from './application/use-cases/update-tenant-contact.use-case';
import { ArchiveTenantContactUseCase } from './application/use-cases/archive-tenant-contact.use-case';
import { PrismaTenantContactRepository } from './infrastructure/repositories/prisma-tenant-contact.repository';
import { ContactsController } from './presentation/contacts.controller';

/**
 * ContactsModule — Bounded context: Renter contact management.
 *
 * Provides the TenantContactRepository implementation via DI token.
 * PrismaService is NOT listed here — it is globally provided by DatabaseModule (@Global).
 *
 * Architecture rules (NON-NEGOTIABLE per constitution):
 * - Only infrastructure/repositories/ files may use PrismaService.
 * - Use cases depend on TenantContactRepository via TENANT_CONTACT_REPOSITORY token.
 * - Controllers MUST NOT inject PrismaService or PrismaTenantContactRepository.
 */
@Module({
  controllers: [ContactsController],
  providers: [
    {
      provide: TENANT_CONTACT_REPOSITORY,
      useClass: PrismaTenantContactRepository,
    },
    CreateTenantContactUseCase,
    GetTenantContactByIdUseCase,
    ListTenantContactsUseCase,
    UpdateTenantContactUseCase,
    ArchiveTenantContactUseCase,
  ],
  exports: [TENANT_CONTACT_REPOSITORY],
})
export class ContactsModule {}
