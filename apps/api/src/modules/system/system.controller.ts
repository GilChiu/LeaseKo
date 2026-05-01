import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { Request } from 'express';
import { StubBearerGuard } from '../../common/guards/stub-bearer.guard';
import { ErrorResponseDto } from '../../shared/dto/error-response.dto';
import { MeResponseDto } from './presentation/dto/me-response.dto';

@ApiTags('System')
@ApiBearerAuth()
@Controller()
export class SystemController {
  @Get('me')
  @UseGuards(StubBearerGuard)
  @ApiOperation({
    summary: 'Get current user context',
    description: "Returns the authenticated caller's user ID and tenant ID derived from the Bearer JWT. Tenant ID is never a manual input.",
  })
  @ApiOkResponse({ type: MeResponseDto, description: 'Authenticated user context' })
  @ApiUnauthorizedResponse({ type: ErrorResponseDto, description: 'Missing or invalid Bearer token' })
  me(@Req() req: Request & { user: MeResponseDto }): MeResponseDto {
    return req.user;
  }
}
