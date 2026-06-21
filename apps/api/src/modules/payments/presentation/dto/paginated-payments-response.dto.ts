import { ApiProperty } from '@nestjs/swagger';
import { PaymentResponseDto } from './payment-response.dto';
import { PagedPayments } from '../../application/types/payment-repository.types';

export class PaginatedPaymentsResponseDto {
  @ApiProperty({ type: [PaymentResponseDto] })
  items!: PaymentResponseDto[];

  @ApiProperty({ example: 42 })
  total!: number;

  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 20 })
  limit!: number;

  static fromDomain(
    result: PagedPayments,
    page: number,
    limit: number,
  ): PaginatedPaymentsResponseDto {
    const dto = new PaginatedPaymentsResponseDto();
    dto.items = result.items.map((p) => PaymentResponseDto.fromDomain(p));
    dto.total = result.total;
    dto.page = page;
    dto.limit = limit;
    return dto;
  }
}
