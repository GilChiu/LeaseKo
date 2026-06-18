import { ApiProperty } from '@nestjs/swagger';
import { InvoiceResponseDto } from './invoice-response.dto';
import { PagedInvoices } from '../../application/types/invoice-repository.types';

export class PaginatedInvoicesResponseDto {
  @ApiProperty({ type: [InvoiceResponseDto] })
  items!: InvoiceResponseDto[];

  @ApiProperty({ example: 42 })
  total!: number;

  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 20 })
  limit!: number;

  static fromDomain(
    result: PagedInvoices,
    page: number,
    limit: number,
  ): PaginatedInvoicesResponseDto {
    const dto = new PaginatedInvoicesResponseDto();
    dto.items = result.items.map((i) => InvoiceResponseDto.fromDomain(i));
    dto.total = result.total;
    dto.page = page;
    dto.limit = limit;
    return dto;
  }
}
